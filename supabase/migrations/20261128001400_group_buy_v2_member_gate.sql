-- Existing group-buy page uses memberships.user_id and status='active'.
-- Internal predicate only; no grants or changes to existing membership records.
create function public.group_buy_v2_active_member(p_user uuid)
returns boolean language sql stable security invoker set search_path='' as $$
 select p_user is not null and
 (select count(*) from public.memberships m where m.user_id=p_user)=1
 and exists(select 1 from public.memberships m where m.user_id=p_user and m.status='active')
$$;
revoke all on function public.group_buy_v2_active_member(uuid) from public,anon,authenticated,service_role;
-- Duplicate or missing memberships fail closed. Verify expiry and renewal semantics
-- against canonical membership schema before connecting checkout and approval.
