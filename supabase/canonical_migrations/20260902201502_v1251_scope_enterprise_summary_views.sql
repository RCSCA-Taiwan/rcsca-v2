-- Canonical export recovered read-only from Staging migration history.
-- Version: 20260902201502; name: v1251_scope_enterprise_summary_views

-- V1251: prevent unrelated authenticated users from enumerating enterprise
-- summary rows. Underlying tables remain protected by RLS.

create or replace view public.enterprise_esg_annual_summary
with (security_invoker = true)
as
select
  e.id as enterprise_id,
  coalesce(a.period_label, '未指定期間') as period_label,
  count(a.id)::integer as report_ready_assets,
  count(distinct a.asset_type)::integer as asset_categories,
  coalesce(sum(a.metric_value) filter (where a.metric_value is not null), 0::numeric) as metric_value_total,
  array_remove(array_agg(distinct tag.tag), null::text) as sdg_tags
from public.enterprises e
left join public.enterprise_esg_assets a
  on a.enterprise_id = e.id
 and a.status = 'approved'::public.review_status
 and a.report_ready = true
left join lateral unnest(coalesce(a.sdg_tags, array[]::text[])) tag(tag) on true
where private.is_enterprise_user(e.id) or (select private.is_admin(null))
group by e.id, coalesce(a.period_label, '未指定期間');

create or replace view public.enterprise_impact_summary
with (security_invoker = true)
as
select
  e.id as enterprise_id,
  count(distinct es.id) filter (where es.status = 'approved'::public.review_status)::integer as approved_shares,
  count(distinct nr.id) filter (where nr.status = 'completed'::public.review_status)::integer as completed_network_requests,
  count(distinct nmr.id) filter (where nmr.status = 'completed'::public.review_status)::integer as completed_network_matches
from public.enterprises e
left join public.enterprise_shares es on es.enterprise_id = e.id
left join public.network_requests nr on nr.requester_enterprise_id = e.id
left join public.network_match_responses nmr on nmr.request_id = nr.id
where private.is_enterprise_user(e.id) or (select private.is_admin(null))
group by e.id;

create or replace view public.enterprise_management_summary
with (security_invoker = true)
as
select
  e.id as enterprise_id,
  coalesce(e.display_name, e.legal_name) as enterprise_name,
  (
    select count(*) from public.enterprise_service_requests r
    where r.enterprise_id = e.id
      and r.status <> all(array[
        'completed'::public.review_status,
        'rejected'::public.review_status,
        'cancelled'::public.review_status
      ])
  ) as active_cases,
  (
    select count(*) from public.enterprise_service_requests r
    where r.enterprise_id = e.id
      and r.next_action_due_at < now()
      and r.status <> all(array[
        'completed'::public.review_status,
        'rejected'::public.review_status,
        'cancelled'::public.review_status
      ])
  ) as overdue_cases,
  (
    select count(*) from public.enterprise_esg_assets a
    where a.enterprise_id = e.id
      and a.status = 'approved'::public.review_status
  ) as approved_outcomes,
  (
    select count(*) from public.enterprise_esg_delivery_readiness d
    where d.enterprise_id = e.id and d.delivery_ready
  ) as deliverable_outcomes,
  (
    select count(distinct s.s)
    from public.enterprise_esg_assets a
    cross join lateral unnest(coalesce(a.sdg_tags, array[]::text[])) s(s)
    where a.enterprise_id = e.id
      and a.status = 'approved'::public.review_status
  ) as sdg_coverage
from public.enterprises e
where private.is_enterprise_user(e.id) or (select private.is_admin(null));

revoke select on public.enterprise_esg_annual_summary from anon;
revoke select on public.enterprise_impact_summary from anon;
revoke select on public.enterprise_management_summary from anon;
grant select on public.enterprise_esg_annual_summary to authenticated;
grant select on public.enterprise_impact_summary to authenticated;
grant select on public.enterprise_management_summary to authenticated;
