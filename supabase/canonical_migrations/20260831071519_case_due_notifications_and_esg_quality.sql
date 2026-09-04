-- Canonical export recovered read-only from Staging migration history.
-- Version: 20260831071519; name: case_due_notifications_and_esg_quality

-- V320: case reminder state + ESG export quality checks
alter table public.enterprise_service_requests add column if not exists last_due_reminder_at timestamptz;
create index if not exists idx_enterprise_service_requests_due_reminder on public.enterprise_service_requests(next_action_due_at,last_due_reminder_at) where status not in ('completed','rejected','cancelled');

create or replace view public.enterprise_esg_export_quality with (security_invoker=true) as
select a.id,a.enterprise_id,a.title,a.period_label,a.status,a.report_ready,
 array_remove(array[
  case when coalesce(trim(a.title),'')='' then '缺少成果標題' end,
  case when coalesce(trim(a.summary),'')='' then '缺少成果摘要' end,
  case when coalesce(trim(a.evidence_note),'')='' then '缺少核實依據' end,
  case when a.metric_value is not null and coalesce(trim(a.metric_unit),'')='' then '量化成果缺少單位' end,
  case when a.metric_value is null and coalesce(trim(a.metric_label),'')<>'' then '量化成果缺少數值' end,
  case when coalesce(array_length(a.sdg_tags,1),0)=0 then '尚未對應 SDG' end
 ],null) as quality_issues,
 (coalesce(trim(a.title),'')<>'' and coalesce(trim(a.summary),'')<>'' and coalesce(trim(a.evidence_note),'')<>'' and (a.metric_value is null or coalesce(trim(a.metric_unit),'')<>'') and (coalesce(trim(a.metric_label),'')='' or a.metric_value is not null)) as export_ready
from public.enterprise_esg_assets a;

create or replace function public.admin_mark_case_due_reminder(p_request_id uuid) returns void language plpgsql security definer set search_path=public as $$ declare v_actor uuid:=auth.uid(); begin if v_actor is null or not exists(select 1 from public.admin_roles where user_id=v_actor and role_key in ('super_admin','admin','enterprise_reviewer')) then raise exception 'insufficient_privilege'; end if; update public.enterprise_service_requests set last_due_reminder_at=now(),updated_at=now() where id=p_request_id and status not in ('completed','rejected','cancelled'); if not found then raise exception 'request_not_remindable'; end if; insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(v_actor,'enterprise_reviewer','mark_due_reminder','enterprise_service_request',p_request_id::text,'案件到期提醒已處理'); end; $$; revoke all on function public.admin_mark_case_due_reminder(uuid) from public,anon; grant execute on function public.admin_mark_case_due_reminder(uuid) to authenticated;
