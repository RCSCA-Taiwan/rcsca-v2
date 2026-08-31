-- V360 deployed to Staging: ESG evidence review workbench and controlled report-ready decision.
create or replace view public.admin_esg_evidence_workbench with (security_invoker=true) as
select a.id,a.enterprise_id,coalesce(e.display_name,e.legal_name,'企業夥伴') enterprise_name,a.title,a.period_label,a.status,a.report_ready,a.updated_at,q.export_ready,q.quality_issues,c.source_type,c.source_reference,c.source_verified,(a.status='approved' and a.report_ready and q.export_ready and coalesce(c.source_verified,false)) delivery_ready
from public.enterprise_esg_assets a left join public.enterprises e on e.id=a.enterprise_id left join public.enterprise_esg_export_quality q on q.id=a.id left join public.enterprise_esg_evidence_chain c on c.asset_id=a.id;
