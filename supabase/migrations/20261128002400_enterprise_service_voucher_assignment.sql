-- Internal assignment history. No direct member or partner access.
create table public.enterprise_service_assignments_v2 (
 id uuid primary key default gen_random_uuid(),
 voucher_id uuid not null references public.enterprise_service_vouchers(id),
 redemption_id uuid not null references public.reward_redemptions(id),
 assigned_at timestamptz not null default now(),
 released_at timestamptz,
 check(released_at is null or released_at>=assigned_at),
 unique(redemption_id)
);
create unique index enterprise_service_active_assignment_v2
 on public.enterprise_service_assignments_v2(voucher_id) where released_at is null;
alter table public.enterprise_service_assignments_v2 enable row level security;
revoke all on public.enterprise_service_assignments_v2 from public,anon,authenticated,service_role;
-- Holder identity must be derived from reward_redemptions.user_id.
-- Assignment, voucher state, catalog eligibility and points must be checked
-- in one authorized transaction before granting any issuance endpoint.
