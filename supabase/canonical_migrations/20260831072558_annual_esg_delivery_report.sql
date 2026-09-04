-- Canonical export recovered read-only from Staging migration history.
-- Version: 20260831072558; name: annual_esg_delivery_report

create or replace view public.enterprise_esg_annual_delivery_report with (security_invoker=true) as select a.enterprise_id, coalesce(nullif(trim(a.period_label),''),'未設定期間') as period_label, count(*) filter(where d.delivery_ready) as deliverable_count, count(*) as total_count, array_remove(array_agg(distinct unnest_sdg.tag),null) as sdg_tags from public.enterprise_esg_assets a left join public.enterprise_esg_delivery_readiness d on d.id=a.id left join lateral unnest(coalesce(a.sdg_tags,array[]::text[])) as unnest_sdg(tag) on true where a.status='approved' group by a.enterprise_id,coalesce(nullif(trim(a.period_label),''),'未設定期間');
