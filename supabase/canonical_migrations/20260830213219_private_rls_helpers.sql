-- Canonical export recovered read-only from Staging migration history.
-- Version: 20260830213219; name: private_rls_helpers

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create or replace function private.is_admin(required_role text default null)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1 from public.admin_roles r
    where r.user_id = (select auth.uid())
      and (required_role is null or r.role_key = required_role or r.role_key = 'super_admin')
  );
$$;

create or replace function private.is_enterprise_user(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, private
as $$
  select exists (
    select 1 from public.enterprise_users eu
    where eu.enterprise_id = target and eu.user_id = (select auth.uid())
  );
$$;

grant execute on function private.is_admin(text) to anon, authenticated;
grant execute on function private.is_enterprise_user(uuid) to authenticated;

-- Replace policies so anonymous public reads never need private membership helpers.
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles for select using (id = (select auth.uid()) or private.is_admin(null));
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles for update using (id = (select auth.uid()) or private.is_admin(null)) with check (id = (select auth.uid()) or private.is_admin(null));

drop policy if exists "membership self read" on public.memberships;
create policy "membership self read" on public.memberships for select using (user_id = (select auth.uid()) or private.is_admin(null));
drop policy if exists "identity verification self read" on public.identity_verifications;
create policy "identity verification self read" on public.identity_verifications for select using (user_id = (select auth.uid()) or private.is_admin(null));

drop policy if exists "activities public read" on public.activities;
create policy "activities public read" on public.activities for select using (status in ('published','active','completed'));
create policy "activities admin read" on public.activities for select to authenticated using (private.is_admin(null));

drop policy if exists "participation self read" on public.activity_participations;
create policy "participation self read" on public.activity_participations for select using (user_id = (select auth.uid()) or private.is_admin(null));
drop policy if exists "footprint self read" on public.sharing_footprints;
create policy "footprint self read" on public.sharing_footprints for select using (user_id = (select auth.uid()) or private.is_admin(null));
drop policy if exists "points self read" on public.point_transactions;
create policy "points self read" on public.point_transactions for select using (user_id = (select auth.uid()) or private.is_admin(null));
drop policy if exists "xp self read" on public.xp_transactions;
create policy "xp self read" on public.xp_transactions for select using (user_id = (select auth.uid()) or private.is_admin(null));
drop policy if exists "level self read" on public.member_levels;
create policy "level self read" on public.member_levels for select using (user_id = (select auth.uid()) or private.is_admin(null));

drop policy if exists "teams authenticated read" on public.teams;
create policy "teams authenticated read" on public.teams for select to authenticated using (is_active or private.is_admin(null));
drop policy if exists "team members own or admin" on public.team_members;
create policy "team members own or admin" on public.team_members for select using (user_id = (select auth.uid()) or private.is_admin(null));
drop policy if exists "invitations involved read" on public.invitations;
create policy "invitations involved read" on public.invitations for select using (inviter_user_id = (select auth.uid()) or invitee_user_id = (select auth.uid()) or private.is_admin(null));

drop policy if exists "enterprises approved public read" on public.enterprises;
create policy "enterprises approved public read" on public.enterprises for select using (status = 'approved');
create policy "enterprises assigned read" on public.enterprises for select to authenticated using (private.is_enterprise_user(id) or private.is_admin(null));

drop policy if exists "enterprise users own enterprise" on public.enterprise_users;
create policy "enterprise users own enterprise" on public.enterprise_users for select to authenticated using (user_id = (select auth.uid()) or private.is_admin(null));

drop policy if exists "enterprise shares approved public read" on public.enterprise_shares;
create policy "enterprise shares approved public read" on public.enterprise_shares for select using (status = 'approved' and public_result = true);
create policy "enterprise shares assigned read" on public.enterprise_shares for select to authenticated using (private.is_enterprise_user(enterprise_id) or private.is_admin(null));

drop policy if exists "enterprise badges public issued read" on public.enterprise_badges;
create policy "enterprise badges public issued read" on public.enterprise_badges for select using (status = 'issued');
create policy "enterprise badges assigned read" on public.enterprise_badges for select to authenticated using (private.is_enterprise_user(enterprise_id) or private.is_admin(null));

drop policy if exists "support case restricted read" on public.support_cases;
create policy "support case restricted read" on public.support_cases for select to authenticated using (owner_user_id = (select auth.uid()) or assigned_to = (select auth.uid()) or private.is_admin('case_manager'));
drop policy if exists "case needs via case access" on public.case_needs;
create policy "case needs via case access" on public.case_needs for select to authenticated using (
  exists(select 1 from public.support_cases c where c.id = case_id and (c.owner_user_id = (select auth.uid()) or c.assigned_to = (select auth.uid()) or private.is_admin('case_manager')))
);

drop policy if exists "network requests owner read" on public.network_requests;
create policy "network requests owner read" on public.network_requests for select to authenticated using (requester_user_id = (select auth.uid()) or private.is_admin(null));

drop policy if exists "admin roles self or super" on public.admin_roles;
create policy "admin roles self or super" on public.admin_roles for select to authenticated using (user_id = (select auth.uid()) or private.is_admin('super_admin'));
drop policy if exists "audit admin read" on public.audit_logs;
create policy "audit admin read" on public.audit_logs for select to authenticated using (private.is_admin(null));

-- Remove obsolete exposed helpers.
drop function if exists public.is_admin(text);
drop function if exists public.is_enterprise_user(uuid);
