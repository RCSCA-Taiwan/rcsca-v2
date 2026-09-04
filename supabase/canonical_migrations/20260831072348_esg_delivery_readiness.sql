-- Canonical export recovered read-only from Staging migration history.
-- Version: 20260831072348; name: esg_delivery_readiness

-- V340: ESG delivery readiness and management summary
create or replace view public.enterprise_esg_delivery_readiness with (security_invoker=true) as
select a.id,a.enterprise_id,a.title,a.period_label,a.status,a.report_ready,
 q.export_ready,
 coalesce(e.source_verified,false) as source_verified,
 q.quality_issues,
 e.source_type,e.source_reference,
 (a.status='approved' and a.report_ready=true and q.export_ready=true and coalesce(e.source_verified,false)=true) as delivery_ready
from public.enterprise_esg_assets a
left join public.enterprise_esg_export_quality q on q.id=a.id
left join public.enterprise_esg_evidence_chain e on e.asset_id=a.id;

create or replace view public.enterprise_esg_management_summary with (security_invoker=true) as
select enterprise_id,period_label,
 count(*) filter(where status='approved') as approved_assets,
 count(*) filter(where report_ready=true) as report_ready_assets,
 count(*) filter(where delivery_ready=true) as delivery_ready_assets,
 count(*) filter(where not delivery_ready) as needs_attention_assets,
 array_remove(array_agg(distinct source_type),null) as source_types
from public.enterprise_esg_delivery_readiness
group by enterprise_id,period_label;

create index if not exists idx_enterprise_esg_assets_enterprise_period_status on public.enterprise_esg_assets(enterprise_id,period_label,status);
