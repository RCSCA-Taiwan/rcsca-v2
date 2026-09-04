-- V1180: restore six admin RPCs referenced by the application.
-- Targeted at the existing RCSCA V2 schema. All mutations are role-guarded,
-- transactional, auditable, and executable only by authenticated users.

create or replace function public.admin_generate_outcome_drafts(p_queue_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_actor uuid := auth.uid();
  v_queue public.outcome_review_queue%rowtype;
begin
  if v_actor is null or not private.is_admin('outcome_reviewer') then
    raise exception 'outcome_reviewer_required';
  end if;
  select * into v_queue from public.outcome_review_queue
  where id=p_queue_id for update;
  if not found then raise exception 'outcome_queue_not_found'; end if;
  if v_queue.status='under_review' then return; end if;
  if v_queue.status not in ('draft','submitted','needs_info') then
    raise exception 'invalid_outcome_queue_status';
  end if;

  if v_queue.proposed_story and not exists (
    select 1 from public.cycle_stories
    where source_type=v_queue.source_type and source_id=v_queue.source_id
  ) then
    insert into public.cycle_stories(
      title,summary,role_flow,source_type,source_id,status,
      consent_confirmed,anonymized,created_by
    ) values (
      '待整理成果',
      '由已完成行動建立的成果草稿，待人工補充、同意確認與審核。',
      array['共享者','RCSCA','受益者'],
      v_queue.source_type,v_queue.source_id,'draft',false,false,v_actor
    );
  end if;

  if v_queue.proposed_esg_asset and v_queue.enterprise_id is not null and not exists (
    select 1 from public.enterprise_esg_assets
    where source_type=v_queue.source_type and source_id=v_queue.source_id
      and enterprise_id=v_queue.enterprise_id
  ) then
    insert into public.enterprise_esg_assets(
      enterprise_id,title,asset_type,summary,source_type,source_id,status,created_by
    ) values (
      v_queue.enterprise_id,'待整理 ESG 成果','outcome',
      '由已完成行動建立的 ESG 素材草稿，待人工補充與審核。',
      v_queue.source_type,v_queue.source_id,'draft',v_actor
    );
  end if;

  update public.outcome_review_queue
  set status='under_review',review_note='成果草稿已建立，待人工審核',updated_at=now()
  where id=p_queue_id;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'outcome_reviewer','generate_outcome_drafts','outcome_review_queue',
    p_queue_id::text,'已建立或確認成果草稿');
end $$;

create or replace function public.admin_publish_cycle_story(
  p_story_id uuid,p_title text,p_summary text,p_consent boolean,
  p_anonymized boolean,p_note text default null
) returns void language plpgsql security definer set search_path=public as $$
declare
  v_actor uuid := auth.uid();
  v_status public.review_status;
begin
  if v_actor is null or not private.is_admin('outcome_reviewer') then
    raise exception 'outcome_reviewer_required';
  end if;
  if not coalesce(p_consent,false) then raise exception 'public_consent_required'; end if;
  if nullif(trim(p_title),'') is null or nullif(trim(p_summary),'') is null then
    raise exception 'title_and_summary_required';
  end if;
  select status into v_status from public.cycle_stories where id=p_story_id for update;
  if not found then raise exception 'cycle_story_not_found'; end if;
  if v_status='approved' then return; end if;
  if v_status not in ('draft','submitted','needs_info') then
    raise exception 'invalid_cycle_story_status';
  end if;
  update public.cycle_stories set
    title=trim(p_title),summary=trim(p_summary),consent_confirmed=true,
    anonymized=coalesce(p_anonymized,false),status='approved',
    published_at=now(),updated_at=now()
  where id=p_story_id;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'outcome_reviewer','publish_cycle_story','cycle_story',
    p_story_id::text,nullif(trim(p_note),''));
end $$;

create or replace function public.admin_approve_esg_asset(
  p_asset_id uuid,p_title text,p_summary text,p_period_label text default null,
  p_note text default null
) returns void language plpgsql security definer set search_path=public as $$
declare
  v_actor uuid := auth.uid();
  v_asset public.enterprise_esg_assets%rowtype;
begin
  if v_actor is null or not private.is_admin('outcome_reviewer') then
    raise exception 'outcome_reviewer_required';
  end if;
  if nullif(trim(p_title),'') is null or nullif(trim(p_summary),'') is null then
    raise exception 'title_and_summary_required';
  end if;
  select * into v_asset from public.enterprise_esg_assets where id=p_asset_id for update;
  if not found then raise exception 'esg_asset_not_found'; end if;
  if v_asset.status='approved' then return; end if;
  if v_asset.status not in ('draft','submitted','needs_info') then
    raise exception 'invalid_esg_asset_status';
  end if;
  update public.enterprise_esg_assets set
    title=trim(p_title),summary=trim(p_summary),
    period_label=nullif(trim(p_period_label),''),
    status='approved',report_ready=false,updated_at=now()
  where id=p_asset_id;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'outcome_reviewer','approve_esg_asset','enterprise_esg_asset',
    p_asset_id::text,nullif(trim(p_note),''));
  insert into public.user_notifications(
    recipient_user_id,kind,title,body,related_type,related_id
  )
  select eu.user_id,'esg_asset','ESG 素材已完成',
    '企業 ESG 素材已完成審核，可至企業專區查看。',
    'enterprise_esg_asset',p_asset_id
  from public.enterprise_users eu where eu.enterprise_id=v_asset.enterprise_id;
end $$;

create or replace function public.admin_set_esg_evidence_review(
  p_asset_id uuid,p_report_ready boolean,p_note text default null
) returns void language plpgsql security definer set search_path=public as $$
declare
  v_actor uuid := auth.uid();
  v_asset public.enterprise_esg_assets%rowtype;
  v_export_ready boolean;
  v_source_verified boolean;
begin
  if v_actor is null or not private.is_admin('outcome_reviewer') then
    raise exception 'outcome_reviewer_required';
  end if;
  select * into v_asset from public.enterprise_esg_assets where id=p_asset_id for update;
  if not found then raise exception 'esg_asset_not_found'; end if;
  if coalesce(p_report_ready,false) then
    select coalesce(export_ready,false) into v_export_ready
    from public.enterprise_esg_export_quality where id=p_asset_id;
    select coalesce(source_verified,false) into v_source_verified
    from public.enterprise_esg_evidence_chain where asset_id=p_asset_id limit 1;
    if v_asset.status<>'approved' or not coalesce(v_export_ready,false)
      or not coalesce(v_source_verified,false) then
      raise exception 'esg_evidence_not_delivery_ready';
    end if;
  end if;
  if v_asset.report_ready=coalesce(p_report_ready,false) then return; end if;
  update public.enterprise_esg_assets
  set report_ready=coalesce(p_report_ready,false),updated_at=now()
  where id=p_asset_id;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'outcome_reviewer',
    case when p_report_ready then 'esg_report_ready' else 'esg_report_hold' end,
    'enterprise_esg_asset',p_asset_id::text,nullif(trim(p_note),''));
  insert into public.user_notifications(
    recipient_user_id,kind,title,body,related_type,related_id
  )
  select eu.user_id,'esg_report',
    case when p_report_ready then 'ESG 成果可供報告使用' else 'ESG 成果暫緩交付' end,
    case when p_report_ready then '成果證據已完成審核，可供正式報告使用。'
      else '成果目前暫緩交付，待內容或證據補強。' end,
    'enterprise_esg_asset',p_asset_id
  from public.enterprise_users eu where eu.enterprise_id=v_asset.enterprise_id;
end $$;

create or replace function public.admin_mark_case_due_reminder(p_request_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare
  v_actor uuid := auth.uid();
  v_request public.enterprise_service_requests%rowtype;
begin
  if v_actor is null or not (
    private.is_admin('enterprise_reviewer') or private.is_admin('admin')
  ) then raise exception 'enterprise_admin_required'; end if;
  select * into v_request from public.enterprise_service_requests
  where id=p_request_id for update;
  if not found then raise exception 'enterprise_request_not_found'; end if;
  if v_request.status in ('completed','rejected','cancelled') then
    raise exception 'enterprise_request_closed';
  end if;
  if v_request.next_action_due_at is null or v_request.next_action_due_at>=now() then
    raise exception 'enterprise_request_not_overdue';
  end if;
  if v_request.last_due_reminder_at is not null
    and v_request.last_due_reminder_at>=v_request.next_action_due_at then return; end if;
  update public.enterprise_service_requests
  set last_due_reminder_at=now(),updated_at=now() where id=p_request_id;
  insert into public.enterprise_service_request_events(
    request_id,event_type,status,note,visible_to_enterprise,created_by
  ) values(p_request_id,'due_reminder_handled',v_request.status,
    '管理端已處理本次到期提醒',false,v_actor);
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'enterprise_reviewer','mark_case_due_reminder',
    'enterprise_service_request',p_request_id::text,'已處理本次到期提醒');
end $$;

create or replace function public.admin_update_enterprise_service_request(
  p_request_id uuid,p_status text,p_assigned_to uuid default null,
  p_note text default null,p_next_action text default null,
  p_next_action_due_at timestamptz default null,
  p_visible_to_enterprise boolean default true
) returns void language plpgsql security definer set search_path=public as $$
declare
  v_actor uuid := auth.uid();
  v_request public.enterprise_service_requests%rowtype;
  v_status public.review_status;
begin
  if v_actor is null or not (
    private.is_admin('enterprise_reviewer') or private.is_admin('admin')
  ) then raise exception 'enterprise_admin_required'; end if;
  begin v_status := p_status::public.review_status;
  exception when invalid_text_representation then raise exception 'invalid_request_status'; end;
  if v_status not in ('under_review','needs_info','approved','matched','completed','rejected') then
    raise exception 'invalid_request_status';
  end if;
  if p_assigned_to is not null and not exists (
    select 1 from public.admin_roles
    where user_id=p_assigned_to and role_key in ('admin','enterprise_reviewer','super_admin')
  ) then raise exception 'invalid_assignee'; end if;
  select * into v_request from public.enterprise_service_requests
  where id=p_request_id for update;
  if not found then raise exception 'enterprise_request_not_found'; end if;
  if v_request.status in ('completed','rejected','cancelled') and v_request.status<>v_status then
    raise exception 'enterprise_request_closed';
  end if;
  update public.enterprise_service_requests set
    status=v_status,admin_note=nullif(trim(p_note),''),
    assigned_to=coalesce(p_assigned_to,assigned_to),
    assigned_at=case when p_assigned_to is not null and p_assigned_to is distinct from assigned_to
      then now() else assigned_at end,
    next_action=nullif(trim(p_next_action),''),
    next_action_due_at=p_next_action_due_at,
    completed_at=case when v_status='completed' then coalesce(completed_at,now()) else null end,
    updated_at=now()
  where id=p_request_id;
  insert into public.enterprise_service_request_events(
    request_id,event_type,status,note,visible_to_enterprise,created_by
  ) values(p_request_id,'admin_update',v_status,nullif(trim(p_note),''),
    coalesce(p_visible_to_enterprise,true),v_actor);
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'enterprise_reviewer','update_enterprise_service_request',
    'enterprise_service_request',p_request_id::text,
    v_request.status::text||' → '||v_status::text);
  if coalesce(p_visible_to_enterprise,true) and v_request.requester_user_id is not null then
    insert into public.user_notifications(
      recipient_user_id,kind,title,body,related_type,related_id
    ) values(v_request.requester_user_id,'enterprise_case','企業合作案件已更新',
      coalesce(nullif(trim(p_note),''),'你的企業合作案件狀態已更新。'),
      'enterprise_service_request',p_request_id);
  end if;
end $$;

revoke all on function public.admin_generate_outcome_drafts(uuid) from public,anon;
revoke all on function public.admin_publish_cycle_story(uuid,text,text,boolean,boolean,text) from public,anon;
revoke all on function public.admin_approve_esg_asset(uuid,text,text,text,text) from public,anon;
revoke all on function public.admin_set_esg_evidence_review(uuid,boolean,text) from public,anon;
revoke all on function public.admin_mark_case_due_reminder(uuid) from public,anon;
revoke all on function public.admin_update_enterprise_service_request(uuid,text,uuid,text,text,timestamptz,boolean) from public,anon;

grant execute on function public.admin_generate_outcome_drafts(uuid) to authenticated;
grant execute on function public.admin_publish_cycle_story(uuid,text,text,boolean,boolean,text) to authenticated;
grant execute on function public.admin_approve_esg_asset(uuid,text,text,text,text) to authenticated;
grant execute on function public.admin_set_esg_evidence_review(uuid,boolean,text) to authenticated;
grant execute on function public.admin_mark_case_due_reminder(uuid) to authenticated;
grant execute on function public.admin_update_enterprise_service_request(uuid,text,uuid,text,text,timestamptz,boolean) to authenticated;
