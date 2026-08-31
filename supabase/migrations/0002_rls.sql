-- RCSCA V2 Row Level Security baseline

alter table public.profiles enable row level security;
alter table public.identity_verifications enable row level security;
alter table public.memberships enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.invitations enable row level security;
alter table public.activities enable row level security;
alter table public.activity_participations enable row level security;
alter table public.sharing_footprints enable row level security;
alter table public.point_transactions enable row level security;
alter table public.xp_transactions enable row level security;
alter table public.member_levels enable row level security;
alter table public.enterprises enable row level security;
alter table public.enterprise_users enable row level security;
alter table public.enterprise_shares enable row level security;
alter table public.enterprise_badges enable row level security;
alter table public.support_cases enable row level security;
alter table public.case_needs enable row level security;
alter table public.network_requests enable row level security;
alter table public.admin_roles enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.is_admin(required_role text default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admin_roles r
    where r.user_id = auth.uid()
      and (required_role is null or r.role_key = required_role or r.role_key = 'super_admin')
  );
$$;

create or replace function public.is_enterprise_user(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.enterprise_users eu
    where eu.enterprise_id = target and eu.user_id = auth.uid()
  );
$$;

-- Public / own profile boundary
create policy "profiles self read" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles self update" on public.profiles for update using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

create policy "membership self read" on public.memberships for select using (user_id = auth.uid() or public.is_admin());
create policy "identity verification self read" on public.identity_verifications for select using (user_id = auth.uid() or public.is_admin());

create policy "activities public read" on public.activities for select using (status in ('published','active','completed') or public.is_admin());
create policy "participation self read" on public.activity_participations for select using (user_id = auth.uid() or public.is_admin());
create policy "footprint self read" on public.sharing_footprints for select using (user_id = auth.uid() or public.is_admin());
create policy "points self read" on public.point_transactions for select using (user_id = auth.uid() or public.is_admin());
create policy "xp self read" on public.xp_transactions for select using (user_id = auth.uid() or public.is_admin());
create policy "level self read" on public.member_levels for select using (user_id = auth.uid() or public.is_admin());

-- Teams: signed-in users may see team basics, private membership only for own/team/admin.
create policy "teams authenticated read" on public.teams for select to authenticated using (is_active or public.is_admin());
create policy "team members own or admin" on public.team_members for select using (user_id = auth.uid() or public.is_admin());
create policy "invitations involved read" on public.invitations for select using (inviter_user_id = auth.uid() or invitee_user_id = auth.uid() or public.is_admin());

-- Enterprise public profile, private management by assigned enterprise users.
create policy "enterprises approved public read" on public.enterprises for select using (status = 'approved' or public.is_enterprise_user(id) or public.is_admin());
create policy "enterprise users own enterprise" on public.enterprise_users for select using (user_id = auth.uid() or public.is_admin());
create policy "enterprise shares approved public read" on public.enterprise_shares for select using (status = 'approved' or public.is_enterprise_user(enterprise_id) or public.is_admin());
create policy "enterprise badges public issued read" on public.enterprise_badges for select using (status = 'issued' or public.is_enterprise_user(enterprise_id) or public.is_admin());

-- High-sensitivity support cases: owner + assigned/admin only.
create policy "support case restricted read" on public.support_cases for select using (owner_user_id = auth.uid() or assigned_to = auth.uid() or public.is_admin('case_manager'));
create policy "case needs via case access" on public.case_needs for select using (
  exists(select 1 from public.support_cases c where c.id = case_id and (c.owner_user_id = auth.uid() or c.assigned_to = auth.uid() or public.is_admin('case_manager')))
);

create policy "network requests owner read" on public.network_requests for select using (requester_user_id = auth.uid() or public.is_admin());

-- Admin/audit are never public.
create policy "admin roles self or super" on public.admin_roles for select using (user_id = auth.uid() or public.is_admin('super_admin'));
create policy "audit admin read" on public.audit_logs for select using (public.is_admin());

-- Important: no direct client policies for point/xp/audit inserts. These must go through trusted server/RPC/admin workflow.
