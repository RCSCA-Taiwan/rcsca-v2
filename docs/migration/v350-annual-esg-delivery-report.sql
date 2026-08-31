-- V350 annual ESG delivery report summary
create or replace view public.enterprise_esg_annual_delivery_report with (security_invoker=true) as
select a.enterprise_id, coalesce(nullif(trim(a.period_label),''),'未設定期間') period_label,
count(*) filter(where d.delivery_ready) deliverable_count,count(*) total_count,
array_remove(array_agg(distinct u.tag),null) sdg_tags
from public.enterprise_esg_assets a
left join public.enterprise_esg_delivery_readiness d on d.id=a.id
left join lateral unnest(coalesce(a.sdg_tags,array[]::text[])) u(tag) on true
where a.status='approved'
group by a.enterprise_id,coalesce(nullif(trim(a.period_label),''),'未設定期間');
