-- Internal read model only; not a public catalog or reservation endpoint.
create function public.enterprise_reward_available_v2(p_reward uuid)
returns bigint language sql stable security invoker set search_path='' as $$
 select coalesce(sum(s.available_quantity),0)
 from public.enterprise_reward_stock_catalog_v2 l
 join public.enterprise_reward_stock_v2 s on s.receipt_id=l.receipt_id
 join public.enterprise_share_receipts r on r.id=s.receipt_id
 join public.enterprise_share_plans p on p.id=r.plan_id
 join public.reward_catalog c on c.id=l.reward_id
 where l.reward_id=p_reward and c.status='approved'
 and c.point_cost=s.points_per_unit
 and p.status in ('accepted','completed')
 and r.verified_at is not null and r.verified_by is not null
 and (p.valid_from is null or p.valid_from <= (now() at time zone 'Asia/Taipei')::date)
 and (p.valid_until is null or p.valid_until >= (now() at time zone 'Asia/Taipei')::date)
 and (c.starts_at is null or c.starts_at<=now())
 and (c.ends_at is null or c.ends_at>now())
$$;
revoke all on function public.enterprise_reward_available_v2(uuid) from public,anon,authenticated,service_role;
-- Never use this read-only sum as a concurrency guard; allocation must lock rows.
