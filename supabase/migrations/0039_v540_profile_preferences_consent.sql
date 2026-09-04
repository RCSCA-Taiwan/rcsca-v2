-- V540: controlled MY 1% preferences, Network contact consent, enterprise profile change review.

alter table public.record_change_requests drop constraint if exists record_change_requests_subject_type_check;
alter table public.record_change_requests add constraint record_change_requests_subject_type_check
  check (subject_type in ('network_profile','enterprise_share','enterprise_profile'));

create or replace function public.account_save_my_one_preferences(p_share_modes text[])
returns void language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_allowed text[]:=array['時間','專業','人脈連結','物資／資源','工作機會','陪伴','分享資訊','還不知道']; v_item text;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  foreach v_item in array coalesce(p_share_modes,array[]::text[]) loop
    if not (v_item=any(v_allowed)) then raise exception 'invalid_share_mode'; end if;
  end loop;
  insert into public.my_one_preferences(user_id,share_modes,updated_at)
  values(v_actor,coalesce(p_share_modes,array[]::text[]),now())
  on conflict(user_id) do update set share_modes=excluded.share_modes,updated_at=now();
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'user','save_my_one_preferences','profile',v_actor::text,'更新 MY 1% 共享方向；不影響 XP、點數或會員等級');
end;$$;
revoke all on function public.account_save_my_one_preferences(text[]) from public,anon;
grant execute on function public.account_save_my_one_preferences(text[]) to authenticated;

create or replace function public.network_set_contact_consent(p_response_id uuid,p_consented boolean)
returns void language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_resp public.network_match_responses%rowtype; v_req public.network_requests%rowtype;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  select * into v_resp from public.network_match_responses where id=p_response_id;
  if not found then raise exception 'response_not_found'; end if;
  select * into v_req from public.network_requests where id=v_resp.request_id;
  if v_actor not in (v_req.requester_user_id,v_resp.responder_user_id) then raise exception 'participant_only'; end if;
  if v_resp.status not in ('matched','completed') then raise exception 'response_not_matched'; end if;
  insert into public.network_contact_consents(response_id,user_id,consented,updated_at)
  values(p_response_id,v_actor,p_consented,now())
  on conflict(response_id,user_id) do update set consented=excluded.consented,updated_at=now();
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'member','set_network_contact_consent','network_match_response',p_response_id::text,case when p_consented then '同意交換聯絡方式' else '撤回聯絡方式交換同意' end);
end;$$;
revoke all on function public.network_set_contact_consent(uuid,boolean) from public,anon;
grant execute on function public.network_set_contact_consent(uuid,boolean) to authenticated;

create or replace function public.request_enterprise_profile_change(
  p_enterprise_id uuid,
  p_display_name text,
  p_industry text,
  p_region text,
  p_public_description text,
  p_requester_note text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_id uuid;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  if not private.is_enterprise_user(p_enterprise_id) then raise exception 'insufficient_privilege'; end if;
  if coalesce(trim(p_display_name),'')='' then raise exception 'display_name_required'; end if;
  if exists(select 1 from public.record_change_requests where subject_type='enterprise_profile' and subject_id=p_enterprise_id and status in ('submitted','under_review','needs_info')) then
    raise exception 'pending_change_request_exists';
  end if;
  insert into public.record_change_requests(requester_user_id,subject_type,subject_id,request_action,proposed_changes,requester_note)
  values(v_actor,'enterprise_profile',p_enterprise_id,'update',jsonb_build_object(
    'display_name',trim(p_display_name),
    'industry',nullif(trim(p_industry),''),
    'region',nullif(trim(p_region),''),
    'public_description',nullif(trim(p_public_description),'')
  ),nullif(trim(p_requester_note),'')) returning id into v_id;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'enterprise_user','request_enterprise_profile_change','enterprise',p_enterprise_id::text,'企業申請修改公開基本資料');
  return v_id;
end;$$;
revoke all on function public.request_enterprise_profile_change(uuid,text,text,text,text,text) from public,anon;
grant execute on function public.request_enterprise_profile_change(uuid,text,text,text,text,text) to authenticated;

create or replace function public.admin_review_record_change(p_request_id uuid,p_decision text,p_reviewer_note text default null)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_actor uuid:=auth.uid();
  v_req public.record_change_requests%rowtype;
  v_title text;
begin
  if v_actor is null or not private.is_admin(null) then raise exception 'insufficient_privilege'; end if;
  if p_decision not in ('approved','needs_info','rejected') then raise exception 'invalid_decision'; end if;
  select * into v_req from public.record_change_requests where id=p_request_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_req.status not in ('submitted','under_review','needs_info') then raise exception 'request_closed'; end if;

  if p_decision='approved' then
    if v_req.subject_type='network_profile' then
      if v_req.request_action='unpublish' then
        update public.network_profiles set public_visible=false,updated_at=now() where id=v_req.subject_id and status='approved';
      else
        update public.network_profiles set
          category=trim(v_req.proposed_changes->>'category'), display_name=trim(v_req.proposed_changes->>'display_name'),
          region=nullif(trim(v_req.proposed_changes->>'region'),''), website_url=nullif(trim(v_req.proposed_changes->>'website_url'),''),
          public_description=nullif(trim(v_req.proposed_changes->>'public_description'),''),
          public_visible=coalesce((v_req.proposed_changes->>'public_visible')::boolean,true),updated_at=now()
        where id=v_req.subject_id and status='approved';
      end if;
      select display_name into v_title from public.network_profiles where id=v_req.subject_id;
    elsif v_req.subject_type='enterprise_share' then
      if v_req.request_action='unpublish' then
        update public.enterprise_shares set public_result=false where id=v_req.subject_id and status='approved';
      else
        update public.enterprise_shares set title=trim(v_req.proposed_changes->>'title'),
          description=nullif(trim(v_req.proposed_changes->>'description'),''),
          public_result=coalesce((v_req.proposed_changes->>'public_result')::boolean,public_result)
        where id=v_req.subject_id and status='approved';
      end if;
      select title into v_title from public.enterprise_shares where id=v_req.subject_id;
    elsif v_req.subject_type='enterprise_profile' then
      update public.enterprises set
        display_name=trim(v_req.proposed_changes->>'display_name'),
        industry=nullif(trim(v_req.proposed_changes->>'industry'),''),
        region=nullif(trim(v_req.proposed_changes->>'region'),''),
        public_description=nullif(trim(v_req.proposed_changes->>'public_description'),''),
        updated_at=now()
      where id=v_req.subject_id;
      select coalesce(display_name,legal_name) into v_title from public.enterprises where id=v_req.subject_id;
    end if;
  end if;

  update public.record_change_requests set status=p_decision::public.review_status,reviewer_user_id=v_actor,
    reviewer_note=nullif(trim(p_reviewer_note),''),reviewed_at=now(),updated_at=now() where id=p_request_id;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'admin','review_approved_record_change',v_req.subject_type,v_req.subject_id::text,p_decision||coalesce(' · '||p_reviewer_note,''));
  insert into public.user_notifications(recipient_user_id,kind,title,body,related_type,related_id)
  values(v_req.requester_user_id,'workflow',case when p_decision='approved' then '資料變更申請已核准' when p_decision='needs_info' then '資料變更申請需要補充' else '資料變更申請未通過' end,
    coalesce(v_title,'你的公開資料')||'：'||coalesce(p_reviewer_note,'請至帳號或企業管理頁查看最新狀態。'),v_req.subject_type,v_req.subject_id);
end;$$;
revoke all on function public.admin_review_record_change(uuid,text,text) from public,anon;
grant execute on function public.admin_review_record_change(uuid,text,text) to authenticated;
