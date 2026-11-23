-- Draft only. Requires authenticated admin review API and storage RLS before rollout.
-- No default conversion rate: the association must approve a rate before suggestions exist.
create table if not exists public.enterprise_share_points_policies (
 id uuid primary key default gen_random_uuid(),
 points_per_twd integer not null check(points_per_twd > 0),
 rounding_increment integer not null default 1 check(rounding_increment > 0),
 effective_from timestamptz not null,
 effective_until timestamptz,
 approved_by uuid not null references auth.users(id),
 approved_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 check(effective_until is null or effective_until > effective_from)
);
create unique index if not exists enterprise_share_points_policies_effective_from on public.enterprise_share_points_policies(effective_from);
comment on table public.enterprise_share_points_policies is 'Admin-approved suggestion rates; no seeded rate until association decides. Do not change approved listings retroactively.';
alter table public.enterprise_share_points_policies enable row level security;
revoke all on public.enterprise_share_points_policies from anon,authenticated;

create table if not exists public.enterprise_share_points_reviews (
 id uuid primary key default gen_random_uuid(),
 plan_id uuid not null references public.enterprise_share_plans(id),
 policy_id uuid references public.enterprise_share_points_policies(id),
 reference_value_twd numeric(12,2),
 suggested_points integer check(suggested_points is null or suggested_points > 0),
 approved_points integer check(approved_points is null or approved_points > 0),
 adjustment_reason text,
 decision text not null check(decision in ('approved','needs_info','rejected')),
 reviewer_user_id uuid not null references auth.users(id),
 reviewed_at timestamptz not null default now(),
 check(decision <> 'approved' or approved_points is not null),
 check(approved_points is null or suggested_points is null or approved_points = suggested_points or length(btrim(coalesce(adjustment_reason,''))) > 0)
);
create index if not exists enterprise_share_points_reviews_plan_time on public.enterprise_share_points_reviews(plan_id,reviewed_at desc);
comment on table public.enterprise_share_points_reviews is 'Append-only review history: suggestion and final approved points are separate; price and policy snapshots retained.';
alter table public.enterprise_share_points_reviews enable row level security;
revoke all on public.enterprise_share_points_reviews from anon,authenticated;

-- The existing plans table contains draft suggested_points/approved_points columns.
-- These are caches only; audit decisions must be sourced from this review history.
-- No public redemption grant or stock release is authorized by a review row alone.
