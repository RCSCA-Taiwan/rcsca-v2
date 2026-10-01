-- Canonical export recovered from Production migration history.
-- Version: 20261001133632; name: v1510_case_outcome_delivery

CREATE OR REPLACE FUNCTION public.admin_update_enterprise_service_request(p_request_id uuid, p_status text, p_assigned_to uuid DEFAULT NULL::uuid, p_note text DEFAULT NULL::text, p_next_action text DEFAULT NULL::text, p_next_action_due_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_visible_to_enterprise boolean DEFAULT true)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  if v_status is null or v_status not in ('under_review','needs_info','approved','matched','completed','rejected') then
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
      'enterprise_service_request',p_request_id)
    on conflict (recipient_user_id,kind,related_type,related_id) where related_id is not null
    do update set title=excluded.title,body=excluded.body,read_at=null,created_at=now();
  end if;
  if v_status='completed' and (v_request.status<>'completed' or not exists(
    select 1 from public.outcome_review_queue where source_type='enterprise_service_request' and source_id=p_request_id
  )) then
    perform public.queue_completed_outcome('enterprise_service_request',p_request_id,v_request.enterprise_id,true,v_request.enterprise_id is not null);
  end if;
end $function$
;

CREATE OR REPLACE FUNCTION public.admin_set_esg_evidence_review(p_asset_id uuid, p_report_ready boolean, p_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  from public.enterprise_users eu where eu.enterprise_id=v_asset.enterprise_id
  on conflict (recipient_user_id,kind,related_type,related_id) where related_id is not null
  do update set title=excluded.title,body=excluded.body,read_at=null,created_at=now();
end $function$
;

create or replace function public.admin_update_esg_evidence(
  p_asset_id uuid,p_evidence_note text,p_sdg_tags text[] default '{}',p_note text default null
) returns void language plpgsql security definer set search_path=public,private as $$
declare v_actor uuid:=auth.uid(); v_asset public.enterprise_esg_assets%rowtype; v_evidence text:=nullif(trim(p_evidence_note),'');
begin
  if v_actor is null or not private.is_admin('outcome_reviewer') then raise exception 'outcome_reviewer_required'; end if;
  if v_evidence is null then raise exception 'evidence_required'; end if;
  select * into v_asset from public.enterprise_esg_assets where id=p_asset_id for update;
  if not found then raise exception 'esg_asset_not_found'; end if;
  if v_asset.status not in ('draft','submitted','needs_info','approved') then raise exception 'invalid_esg_asset_status'; end if;
  if v_asset.evidence_note is not distinct from v_evidence and v_asset.sdg_tags is not distinct from coalesce(p_sdg_tags,'{}') then return; end if;
  update public.enterprise_esg_assets set evidence_note=v_evidence,sdg_tags=coalesce(p_sdg_tags,'{}'),report_ready=false,updated_at=now() where id=p_asset_id;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'outcome_reviewer','update_esg_evidence','enterprise_esg_asset',p_asset_id::text,nullif(trim(p_note),''));
  if v_asset.report_ready then
    insert into public.user_notifications(recipient_user_id,kind,title,body,related_type,related_id)
    select eu.user_id,'esg_report','ESG 成果暫緩交付','核實依據已修改，待重新確認後才能供正式報告使用。','enterprise_esg_asset',p_asset_id
    from public.enterprise_users eu where eu.enterprise_id=v_asset.enterprise_id
    on conflict (recipient_user_id,kind,related_type,related_id) where related_id is not null
    do update set title=excluded.title,body=excluded.body,read_at=null,created_at=now();
  end if;
end;$$;
revoke all on function public.admin_update_esg_evidence(uuid,text,text[],text) from public,anon;
grant execute on function public.admin_update_esg_evidence(uuid,text,text[],text) to authenticated;
