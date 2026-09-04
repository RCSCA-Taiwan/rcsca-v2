-- Canonical export recovered read-only from Staging migration history.
-- Version: 20260831064524; name: v190_impact_views

-- V190: read-only impact summaries derived from verified/completed workflow data.
create or replace view public.enterprise_impact_summary with (security_invoker=true) as
select e.id as enterprise_id,
 count(distinct es.id) filter (where es.status='approved')::int as approved_shares,
 count(distinct nr.id) filter (where nr.status='completed')::int as completed_network_requests,
 count(distinct nmr.id) filter (where nmr.status='completed')::int as completed_network_matches
from public.enterprises e
left join public.enterprise_shares es on es.enterprise_id=e.id
left join public.network_requests nr on nr.requester_enterprise_id=e.id
left join public.network_match_responses nmr on nmr.request_id=nr.id
group by e.id;

grant select on public.enterprise_impact_summary to authenticated;

create or replace view public.user_sharing_summary with (security_invoker=true) as
select p.id as user_id,
 count(sf.id)::int as footprint_count,
 count(sf.id) filter (where sf.footprint_type='care')::int as care_count,
 count(sf.id) filter (where sf.footprint_type='connection')::int as connection_count,
 max(sf.created_at) as latest_footprint_at
from public.profiles p
left join public.sharing_footprints sf on sf.user_id=p.id
group by p.id;

grant select on public.user_sharing_summary to authenticated;
