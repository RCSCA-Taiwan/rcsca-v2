-- V530: approved-record change requests + guarded user submission RPCs.

create table if not exists public.record_change_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references public.profiles(id) on delete cascade,
  subject_type text not null check (subject_type in ('network_profile','enterprise_share')),
  subject_id uuid not null,
  request_action text not null check (request_action in ('update','unpublish')),
  proposed_changes jsonb not null default '{}'::jsonb,
  requester_note text,
  status public.review_status not null default 'submitted',
  reviewer_user_id uuid references public.profiles(id),
  reviewer_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.record_change_requests enable row level security;
grant select on public.record_change_requests to authenticated;

create policy "change requests requester/admin read" on public.record_change_requests
for select to authenticated using (
  requester_user_id=(select auth.uid()) or private.is_admin(null)
);

create index if not exists idx_record_change_requests_status_created
  on public.record_change_requests(status,created_at);
create index if not exists idx_record_change_requests_requester
  on public.record_change_requests(requester_user_id,created_at desc);

create or replace function public.request_approved_record_change(
  p_subject_type text,
  p_subject_id uuid,
  p_request_action text,
  p_proposed_changes jsonb default '{}'::jsonb,
  p_requester_note text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_actor uuid:=auth.uid();
  v_id uuid;
  v_np public.network_profiles%rowtype;
  v_es public.enterprise_shares%rowtype;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  if p_subject_type not in ('network_profile','enterprise_share') then raise exception 'invalid_subject_type'; end if;
  if p_request_action not in ('update','unpublish') then raise exception 'invalid_request_action'; end if;

  if p_subject_type='network_profile' then
    select * into v_np from public.network_profiles where id=p_subject_id;
    if not found or v_np.user_id<>v_actor then raise exception 'subject_not_found'; end if;
    if v_np.status<>'approved' then raise exception 'subject_not_approved'; end if;
    if p_request_action='update' and (
      coalesce(trim(p_proposed_changes->>'display_name'),'')='' or
      coalesce(trim(p_proposed_changes->>'category'),'')='' or
      coalesce(trim(p_proposed_changes->>'region'),'')='' or
      coalesce(trim(p_proposed_changes->>'public_description'),'')=''
    ) then raise exception 'required_fields_missing'; end if;
  else
    select * into v_es from public.enterprise_shares where id=p_subject_id;
    if not found or not private.is_enterprise_user(v_es.enterprise_id) then raise exception 'subject_not_found'; end if;
    if v_es.status<>'approved' then raise exception 'subject_not_approved'; end if;
    if p_request_action='update' and coalesce(trim(p_proposed_changes->>'title'),'')='' then raise exception 'title_required'; end if;
  end if;

  if exists(select 1 from public.record_change_requests where subject_type=p_subject_type and subject_id=p_subject_id and status in ('submitted','under_review','needs_info')) then
    raise exception 'pending_change_request_exists';
  end if;

  insert into public.record_change_requests(requester_user_id,subject_type,subject_id,request_action,proposed_changes,requester_note)
  values(v_actor,p_subject_type,p_subject_id,p_request_action,coalesce(p_proposed_changes,'{}'::jsonb),nullif(trim(p_requester_note),''))
  returning id into v_id;

  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,case when p_subject_type='enterprise_share' then 'enterprise_user' else 'user' end,'request_approved_record_change',p_subject_type,p_subject_id::text,p_request_action);
  return v_id;
end;$$;
revoke all on function public.request_approved_record_change(text,uuid,text,jsonb,text) from public,anon;
grant execute on function public.request_approved_record_change(text,uuid,text,jsonb,text) to authenticated;

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
          category=trim(v_req.proposed_changes->>'category'),
          display_name=trim(v_req.proposed_changes->>'display_name'),
          region=nullif(trim(v_req.proposed_changes->>'region'),''),
          website_url=nullif(trim(v_req.proposed_changes->>'website_url'),''),
          public_description=nullif(trim(v_req.proposed_changes->>'public_description'),''),
          public_visible=coalesce((v_req.proposed_changes->>'public_visible')::boolean,true),
          updated_at=now()
        where id=v_req.subject_id and status='approved';
      end if;
      select display_name into v_title from public.network_profiles where id=v_req.subject_id;
    else
      if v_req.request_action='unpublish' then
        update public.enterprise_shares set public_result=false where id=v_req.subject_id and status='approved';
      else
        update public.enterprise_shares set
          title=trim(v_req.proposed_changes->>'title'),
          description=nullif(trim(v_req.proposed_changes->>'description'),''),
          public_result=coalesce((v_req.proposed_changes->>'public_result')::boolean,public_result)
        where id=v_req.subject_id and status='approved';
      end if;
      select title into v_title from public.enterprise_shares where id=v_req.subject_id;
    end if;
  end if;

  update public.record_change_requests set status=p_decision::public.review_status,reviewer_user_id=v_actor,reviewer_note=nullif(trim(p_reviewer_note),''),reviewed_at=now(),updated_at=now() where id=p_request_id;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'admin','review_approved_record_change',v_req.subject_type,v_req.subject_id::text,p_decision||coalesce(' · '||p_reviewer_note,''));
  insert into public.user_notifications(recipient_user_id,kind,title,body,related_type,related_id)
  values(v_req.requester_user_id,'workflow',case when p_decision='approved' then '資料變更申請已核准' when p_decision='needs_info' then '資料變更申請需要補充' else '資料變更申請未通過' end,
    coalesce(v_title,'你的公開資料')||'：'||coalesce(p_reviewer_note,'請至帳號頁查看最新狀態。'),v_req.subject_type,v_req.subject_id);
end;$$;
revoke all on function public.admin_review_record_change(uuid,text,text) from public,anon;
grant execute on function public.admin_review_record_change(uuid,text,text) to authenticated;

create or replace function public.network_submit_response(p_request_id uuid,p_message text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_id uuid; v_req public.network_requests%rowtype; v_enterprise uuid;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  if char_length(trim(coalesce(p_message,'')))<2 then raise exception 'message_required'; end if;
  select * into v_req from public.network_requests where id=p_request_id;
  if not found or v_req.requester_user_id=v_actor or v_req.status not in ('submitted','under_review','approved','matched') then raise exception 'request_not_available'; end if;
  select enterprise_id into v_enterprise from public.enterprise_users where user_id=v_actor order by created_at asc limit 1;
  insert into public.network_match_responses(request_id,responder_user_id,responder_enterprise_id,message,status,contact_exchange_allowed)
  values(p_request_id,v_actor,v_enterprise,trim(p_message),'submitted',false) returning id into v_id;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'member','submit_network_response','network_match_response',v_id::text,'會員回應 Network 媒合需求');
  return v_id;
end;$$;
revoke all on function public.network_submit_response(uuid,text) from public,anon;
grant execute on function public.network_submit_response(uuid,text) to authenticated;

create or replace function public.reward_submit_redemption(p_reward_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_reward public.reward_catalog%rowtype; v_id uuid; v_points integer; v_level integer; v_footprints integer;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  select * into v_reward from public.reward_catalog where id=p_reward_id and status='approved' for share;
  if not found then raise exception 'reward_not_available'; end if;
  if v_reward.starts_at is not null and v_reward.starts_at>now() then raise exception 'reward_not_started'; end if;
  if v_reward.ends_at is not null and v_reward.ends_at<now() then raise exception 'reward_ended'; end if;
  if v_reward.stock_remaining is not null and v_reward.stock_remaining<=0 then raise exception 'reward_out_of_stock'; end if;
  select coalesce(sum(points),0)::int into v_points from public.point_transactions where user_id=v_actor;
  select coalesce(level,1) into v_level from public.member_levels where user_id=v_actor;
  if v_level is null then v_level:=1; end if;
  select count(*)::int into v_footprints from public.sharing_footprints where user_id=v_actor;
  if v_points<v_reward.point_cost or v_level<coalesce(v_reward.min_level,1) or v_footprints<v_reward.min_footprints then raise exception 'eligibility_not_met'; end if;
  if exists(select 1 from public.reward_redemptions where reward_id=p_reward_id and user_id=v_actor and status in ('submitted','under_review','approved')) then raise exception 'existing_redemption_pending'; end if;
  insert into public.reward_redemptions(reward_id,user_id,point_cost,status) values(p_reward_id,v_actor,v_reward.point_cost,'submitted') returning id into v_id;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(v_actor,'member','submit_reward_redemption','reward_redemption',v_id::text,'會員提出共享所兌換申請');
  return v_id;
end;$$;
revoke all on function public.reward_submit_redemption(uuid) from public,anon;
grant execute on function public.reward_submit_redemption(uuid) to authenticated;

create or replace function public.activity_register_participation(p_activity_id uuid,p_source_channel text default 'website')
returns uuid language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_id uuid; v_status text;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  select status into v_status from public.activities where id=p_activity_id;
  if v_status is null or v_status not in ('published','active') then raise exception 'activity_not_open'; end if;
  insert into public.activity_participations(activity_id,user_id,participation_type,source_channel,status)
  values(p_activity_id,v_actor,'participant',coalesce(nullif(trim(p_source_channel),''),'website'),'pending')
  on conflict(activity_id,user_id,participation_type) do update set source_channel=excluded.source_channel
  returning id into v_id;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(v_actor,'user','register_activity_participation','activity_participation',v_id::text,'使用者登記公益活動參與');
  return v_id;
end;$$;
revoke all on function public.activity_register_participation(uuid,text) from public,anon;
grant execute on function public.activity_register_participation(uuid,text) to authenticated;

create or replace function public.enterprise_submit_service_request(
  p_company_name text,p_contact_name text,p_contact_email text,p_contact_phone text,p_needs text[],p_goal text,p_service_tier text
) returns text language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_enterprise uuid; v_case_number text;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  if coalesce(trim(p_company_name),'')='' or coalesce(trim(p_contact_name),'')='' or coalesce(trim(p_contact_email),'')='' then raise exception 'required_fields_missing'; end if;
  select enterprise_id into v_enterprise from public.enterprise_users where user_id=v_actor order by created_at asc limit 1;
  insert into public.enterprise_service_requests(enterprise_id,requester_user_id,company_name,contact_name,contact_email,contact_phone,needs,goal,service_tier)
  values(v_enterprise,v_actor,trim(p_company_name),trim(p_contact_name),trim(p_contact_email),nullif(trim(p_contact_phone),''),coalesce(p_needs,'{}'),nullif(trim(p_goal),''),p_service_tier)
  returning case_number into v_case_number;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(v_actor,'enterprise_user','submit_enterprise_service_request','enterprise_service_request',v_case_number,'企業建立 ESG 合作案件');
  return v_case_number;
end;$$;
revoke all on function public.enterprise_submit_service_request(text,text,text,text,text[],text,text) from public,anon;
grant execute on function public.enterprise_submit_service_request(text,text,text,text,text[],text,text) to authenticated;
