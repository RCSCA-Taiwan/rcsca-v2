-- Canonical export recovered read-only from Staging migration history.
-- Version: 20260902200656; name: v1232_scope_membership_helper_to_caller

-- V1232: prevent signed-in users from probing another user's membership state.
-- The only dependent RPC passes the current caller ID.

create or replace function public.is_active_member(
  target_user uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    target_user = auth.uid()
    and exists (
      select 1
      from public.memberships m
      where m.user_id = target_user
        and m.status = 'active'
        and m.membership_type in ('annual','lifetime')
    );
$$;

revoke all on function public.is_active_member(uuid) from public, anon;
grant execute on function public.is_active_member(uuid) to authenticated;
