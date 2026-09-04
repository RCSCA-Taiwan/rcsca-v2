-- Canonical export recovered read-only from Staging migration history.
-- Version: 20260831071807; name: esg_evidence_chain

-- V330: evidence chain for enterprise ESG deliverables
create or replace view public.enterprise_esg_evidence_chain with (security_invoker=true) as
select a.id as asset_id,a.enterprise_id,a.title,a.asset_type,a.period_label,a.summary,a.metric_label,a.metric_value,a.metric_unit,a.sdg_tags,a.evidence_note,a.source_type,a.source_id,a.status,a.report_ready,
 case
  when a.source_type='enterprise_service_request' then (select r.case_number from public.enterprise_service_requests r where r.id=a.source_id)
  when a.source_type='network_match_response' then '1% Network 完成媒合'
  when a.source_type='activity_participation' then '公益行動核實紀錄'
  else null
 end as source_reference,
 case
  when a.source_type='enterprise_service_request' then exists(select 1 from public.enterprise_service_requests r where r.id=a.source_id and r.status='completed')
  when a.source_type='network_match_response' then exists(select 1 from public.network_match_responses m where m.id=a.source_id and m.status='completed')
  when a.source_type='activity_participation' then exists(select 1 from public.activity_participations p where p.id=a.source_id and p.status='verified')
  else false
 end as source_verified
from public.enterprise_esg_assets a;

create index if not exists idx_enterprise_esg_assets_source on public.enterprise_esg_assets(source_type,source_id);
