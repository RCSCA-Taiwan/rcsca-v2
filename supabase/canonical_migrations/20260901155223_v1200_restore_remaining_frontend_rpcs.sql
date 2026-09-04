-- Canonical export recovered read-only from Staging migration history.
-- Version: 20260901155223; name: v1200_restore_remaining_frontend_rpcs

-- V1200: reconcile every RPC currently called by the frontend but absent from Staging.

create table if not exists public.enterprise_applications (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references public.profiles(id) on delete cascade,
  enterprise_id uuid references public.enterprises(id) on delete set null,
  company_name text not null,
  tax_id text not null,
  contact_name text not null,
  contact_email text not null,
  contact_phone text,
  region text,
  share_options text[] not null default '{}',
  direction text,
  status public.review_status not null default 'submitted',
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_enterprise_applications_requester_created
  on public.enterprise_applications(requester_user_id,created_at desc);
create index if not exists idx_enterprise_applications_status_created
  on public.enterprise_applications(status,created_at desc);
alter table public.enterprise_applications enable row level security;
grant select on public.enterprise_applications to authenticated;
drop policy if exists "enterprise applications own read" on public.enterprise_applications;
create policy "enterprise applications own read" on public.enterprise_applications
for select to authenticated using (
  requester_user_id=(select auth.uid()) or private.is_admin(null)
);

create or replace function public.submit_enterprise_application(
  p_company_name text,
  p_tax_id text,
  p_contact_name text,
  p_contact_email text,
  p_contact_phone text,
  p_region text,
  p_share_options text[],
  p_direction text
) returns uuid
language plpgsql security definer set search_path=public,private as $$
declare v_actor uuid:=auth.uid(); v_id uuid; v_enterprise uuid;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  if nullif(trim(p_company_name),'') is null
    or nullif(trim(p_tax_id),'') is null
    or nullif(trim(p_contact_name),'') is null
    or nullif(trim(p_contact_email),'') is null then
    raise exception 'required_fields_missing';
  end if;
  if position('@' in trim(p_contact_email))<2 then raise exception 'invalid_email'; end if;
  select id into v_enterprise from public.enterprises where tax_id=trim(p_tax_id) limit 1;
  insert into public.enterprise_applications(
    requester_user_id,enterprise_id,company_name,tax_id,contact_name,contact_email,
    contact_phone,region,share_options,direction
  ) values(
    v_actor,v_enterprise,trim(p_company_name),trim(p_tax_id),trim(p_contact_name),
    lower(trim(p_contact_email)),nullif(trim(p_contact_phone),''),nullif(trim(p_region),''),
    coalesce(p_share_options,'{}'),coalesce(nullif(trim(p_direction),''),'consult')
  ) returning id into v_id;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'applicant','enterprise_application_submitted','enterprise_application',v_id::text,trim(p_company_name));
  return v_id;
end;$$;

create or replace function public.submit_support_case(
  p_categories text[],p_contact_name text,p_mobile text,p_region text,p_detail text
) returns uuid
language plpgsql security definer set search_path=public,private as $$
declare v_actor uuid:=auth.uid(); v_case uuid; v_category text;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  if coalesce(array_length(p_categories,1),0)=0
    or nullif(trim(p_contact_name),'') is null
    or nullif(trim(p_mobile),'') is null
    or nullif(trim(p_detail),'') is null then
    raise exception 'required_fields_missing';
  end if;
  insert into public.support_cases(owner_user_id,title,public_summary,private_detail,privacy,status)
  values(
    v_actor,'生活支持需求',
    array_to_string(p_categories,'、')||case when nullif(trim(p_region),'') is not null then '｜'||trim(p_region) else '' end,
    '聯絡人：'||trim(p_contact_name)||E'\n手機：'||trim(p_mobile)||E'\n地區：'||coalesce(trim(p_region),'')||E'\n完整說明：'||trim(p_detail),
    'restricted','submitted'
  ) returning id into v_case;
  foreach v_category in array p_categories loop
    if nullif(trim(v_category),'') is not null then
      insert into public.case_needs(case_id,category,description,status)
      values(v_case,trim(v_category),trim(p_detail),'submitted');
    end if;
  end loop;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'requester','support_case_submitted','support_case',v_case::text,array_to_string(p_categories,'、'));
  return v_case;
end;$$;

create or replace function public.admin_review_enterprise_application(
  p_application_id uuid,p_decision public.review_status,p_note text default null
) returns uuid
language plpgsql security definer set search_path=public,private as $$
declare v_application public.enterprise_applications%rowtype; v_actor uuid:=auth.uid(); v_enterprise uuid;
begin
  if not private.is_admin(null) then raise exception 'admin_required'; end if;
  if p_decision not in ('approved','needs_info','rejected') then raise exception 'invalid_decision'; end if;
  select * into v_application from public.enterprise_applications where id=p_application_id for update;
  if not found then raise exception 'application_not_found'; end if;
  if v_application.status not in ('submitted','needs_info') then raise exception 'invalid_status_transition'; end if;
  if p_decision='needs_info' and nullif(trim(coalesce(p_note,'')),'') is null then raise exception 'note_required'; end if;
  v_enterprise:=v_application.enterprise_id;
  if p_decision='approved' then
    if v_enterprise is null then
      insert into public.enterprises(tax_id,legal_name,display_name,region,status)
      values(v_application.tax_id,v_application.company_name,v_application.company_name,v_application.region,'approved')
      on conflict(tax_id) do update set status='approved',updated_at=now()
      returning id into v_enterprise;
    else
      update public.enterprises set status='approved',updated_at=now() where id=v_enterprise;
    end if;
    insert into public.enterprise_users(enterprise_id,user_id,role)
    values(v_enterprise,v_application.requester_user_id,'manager')
    on conflict(enterprise_id,user_id) do nothing;
  end if;
  update public.enterprise_applications
  set enterprise_id=v_enterprise,status=p_decision,review_note=nullif(trim(p_note),''),updated_at=now()
  where id=p_application_id;
  insert into public.user_notifications(recipient_user_id,kind,title,body,related_type,related_id)
  values(
    v_application.requester_user_id,'enterprise_application','企業加入申請已更新',
    case p_decision when 'approved' then '企業身份已核准並連結到你的帳號。'
      when 'needs_info' then 'RCSCA 需要你補充企業申請資料。'
      else '本次企業加入申請未通過。' end,
    'enterprise_application',p_application_id
  );
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'admin','enterprise_application_'||p_decision::text,'enterprise_application',p_application_id::text,p_note);
  return v_enterprise;
end;$$;

create or replace function public.admin_review_reward_redemption(
  p_redemption_id uuid,p_decision public.review_status,p_note text default null
) returns void
language plpgsql security definer set search_path=public,private as $$
declare v_redemption public.reward_redemptions%rowtype; v_reward public.reward_catalog%rowtype; v_actor uuid:=auth.uid(); v_balance integer; v_code text;
begin
  if not private.is_admin(null) then raise exception 'admin_required'; end if;
  if p_decision not in ('approved','rejected','completed') then raise exception 'invalid_decision'; end if;
  select * into v_redemption from public.reward_redemptions where id=p_redemption_id for update;
  if not found then raise exception 'redemption_not_found'; end if;
  select * into v_reward from public.reward_catalog where id=v_redemption.reward_id for update;
  if not found then raise exception 'reward_not_found'; end if;
  if p_decision in ('approved','rejected') and v_redemption.status<>'submitted' then raise exception 'invalid_status_transition'; end if;
  if p_decision='completed' and v_redemption.status<>'approved' then raise exception 'invalid_status_transition'; end if;
  if p_decision='approved' then
    select coalesce(sum(points),0) into v_balance from public.point_transactions where user_id=v_redemption.user_id;
    if v_balance<v_redemption.point_cost then raise exception 'insufficient_points'; end if;
    if v_reward.stock_remaining is not null and v_reward.stock_remaining<=0 then raise exception 'out_of_stock'; end if;
    insert into public.point_transactions(user_id,tx_type,points,source_type,source_id,description,created_by)
    values(v_redemption.user_id,'spend',-v_redemption.point_cost,'reward_redemption',v_redemption.id,'共享所兌換｜'||v_reward.title,v_actor);
    if v_reward.stock_remaining is not null then
      update public.reward_catalog set stock_remaining=stock_remaining-1,updated_at=now() where id=v_reward.id;
    end if;
    v_code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
    update public.reward_redemptions set status='approved',redemption_code=coalesce(redemption_code,v_code),updated_at=now() where id=v_redemption.id;
  elsif p_decision='rejected' then
    update public.reward_redemptions set status='rejected',updated_at=now() where id=v_redemption.id;
  else
    update public.reward_redemptions set status='completed',updated_at=now() where id=v_redemption.id;
  end if;
  insert into public.user_notifications(recipient_user_id,kind,title,body,related_type,related_id)
  values(v_redemption.user_id,'reward_redemption','共享所兌換狀態已更新',
    case p_decision when 'approved' then '兌換已核准，共享點已扣除並產生兌換碼。'
      when 'completed' then '這筆共享回饋已完成核銷。' else '這筆兌換申請未通過，未扣除共享點。' end,
    'reward_redemption',v_redemption.id);
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'admin','reward_redemption_'||p_decision::text,'reward_redemption',v_redemption.id::text,p_note);
end;$$;

create or replace function public.request_identity_verification(
  p_verification_kind text,p_identity_token text default null
) returns uuid
language plpgsql security definer set search_path=public,private as $$
declare v_actor uuid:=auth.uid(); v_id uuid; v_hash text;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  if nullif(trim(p_verification_kind),'') is null then raise exception 'verification_kind_required'; end if;
  v_hash:=case when nullif(trim(coalesce(p_identity_token,'')),'') is null then null
    else encode(digest(trim(p_identity_token),'sha256'),'hex') end;
  insert into public.identity_verifications(user_id,verification_kind,identity_token_hash,status,verified_at,verified_by)
  values(v_actor,trim(p_verification_kind),v_hash,'pending',null,null)
  on conflict(user_id,verification_kind) do update
  set identity_token_hash=excluded.identity_token_hash,status='pending',verified_at=null,verified_by=null,created_at=now()
  returning id into v_id;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'user','identity_verification_requested','identity_verification',v_id::text,trim(p_verification_kind));
  return v_id;
end;$$;

create or replace function public.admin_review_identity_verification(
  p_verification_id uuid,p_approved boolean,p_note text default null
) returns void
language plpgsql security definer set search_path=public,private as $$
declare v_verification public.identity_verifications%rowtype; v_actor uuid:=auth.uid();
begin
  if not private.is_admin(null) then raise exception 'admin_required'; end if;
  select * into v_verification from public.identity_verifications where id=p_verification_id for update;
  if not found then raise exception 'verification_not_found'; end if;
  if v_verification.status<>'pending' then raise exception 'invalid_status_transition'; end if;
  update public.identity_verifications
  set status=case when p_approved then 'verified' else 'rejected' end,
      verified_at=case when p_approved then now() else null end,verified_by=v_actor
  where id=p_verification_id;
  insert into public.user_notifications(recipient_user_id,kind,title,body,related_type,related_id)
  values(v_verification.user_id,'identity_verification','身份驗證狀態已更新',
    case when p_approved then '你的身份驗證已完成。' else '身份驗證未通過，請確認資料後重新提出。' end,
    'identity_verification',p_verification_id);
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'admin',case when p_approved then 'identity_verified' else 'identity_rejected' end,
    'identity_verification',p_verification_id::text,p_note);
end;$$;

create or replace function public.admin_set_membership(
  p_user_id uuid,
  p_membership_type public.membership_type,
  p_member_since date default current_date,
  p_member_number text default null,
  p_status text default 'active',
  p_note text default null
) returns uuid
language plpgsql security definer set search_path=public,private as $$
declare v_actor uuid:=auth.uid(); v_id uuid;
begin
  if not private.is_admin(null) then raise exception 'admin_required'; end if;
  if not exists(select 1 from public.profiles where id=p_user_id) then raise exception 'profile_not_found'; end if;
  if coalesce(nullif(trim(p_status),''),'active') not in ('active','inactive','pending') then raise exception 'invalid_status'; end if;
  insert into public.memberships(user_id,membership_type,member_since,member_number,status)
  values(p_user_id,p_membership_type,p_member_since,nullif(trim(coalesce(p_member_number,'')),''),coalesce(nullif(trim(p_status),''),'active'))
  on conflict(user_id) do update
  set membership_type=excluded.membership_type,member_since=excluded.member_since,
      member_number=coalesce(excluded.member_number,public.memberships.member_number),status=excluded.status,updated_at=now()
  returning id into v_id;
  insert into public.user_notifications(recipient_user_id,kind,title,body,related_type,related_id)
  values(p_user_id,'membership','RCSCA 會員身份已更新','你的正式會員身份已由協會更新，可在「身份與使用權限」查看。','membership',v_id);
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'admin','membership_updated','membership',v_id::text,p_note);
  return v_id;
end;$$;

create or replace function public.enterprise_resubmit_share(
  p_share_id uuid,p_title text,p_description text default null,p_share_type public.share_type default null
) returns void
language plpgsql security definer set search_path=public,private as $$
declare v_actor uuid:=auth.uid(); v_share public.enterprise_shares%rowtype;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  select * into v_share from public.enterprise_shares where id=p_share_id for update;
  if not found then raise exception 'share_not_found'; end if;
  if not private.is_enterprise_user(v_share.enterprise_id) then raise exception 'insufficient_privilege'; end if;
  if v_share.status<>'needs_info' then raise exception 'share_not_waiting_for_info'; end if;
  if nullif(trim(p_title),'') is null then raise exception 'title_required'; end if;
  update public.enterprise_shares
  set title=trim(p_title),description=nullif(trim(p_description),''),
      share_type=coalesce(p_share_type,share_type),status='submitted',public_result=false
  where id=p_share_id;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'enterprise','resubmit_enterprise_share','enterprise_share',p_share_id::text,'企業補件後重新送審');
end;$$;

revoke all on function public.submit_enterprise_application(text,text,text,text,text,text,text[],text) from public,anon;
revoke all on function public.submit_support_case(text[],text,text,text,text) from public,anon;
revoke all on function public.admin_review_enterprise_application(uuid,public.review_status,text) from public,anon;
revoke all on function public.admin_review_reward_redemption(uuid,public.review_status,text) from public,anon;
revoke all on function public.request_identity_verification(text,text) from public,anon;
revoke all on function public.admin_review_identity_verification(uuid,boolean,text) from public,anon;
revoke all on function public.admin_set_membership(uuid,public.membership_type,date,text,text,text) from public,anon;
revoke all on function public.enterprise_resubmit_share(uuid,text,text,public.share_type) from public,anon;

grant execute on function public.submit_enterprise_application(text,text,text,text,text,text,text[],text) to authenticated;
grant execute on function public.submit_support_case(text[],text,text,text,text) to authenticated;
grant execute on function public.admin_review_enterprise_application(uuid,public.review_status,text) to authenticated;
grant execute on function public.admin_review_reward_redemption(uuid,public.review_status,text) to authenticated;
grant execute on function public.request_identity_verification(text,text) to authenticated;
grant execute on function public.admin_review_identity_verification(uuid,boolean,text) to authenticated;
grant execute on function public.admin_set_membership(uuid,public.membership_type,date,text,text,text) to authenticated;
grant execute on function public.enterprise_resubmit_share(uuid,text,text,public.share_type) to authenticated;
