-- RCSCA group-buy v2 agreed pricing. New tables only; legacy fee tiers remain untouched until migration.
-- Fee is per completed, non-refunded ORDER, not per unit; shipping is excluded.
create table if not exists public.group_buy_v2_fee_policies (
 id integer primary key generated always as identity,
 effective_from timestamptz not null default now(),
 base_fee numeric(12,2) not null check (base_fee >= 0),
 per_order_fee numeric(12,2) not null check (per_order_fee >= 0),
 max_fee numeric(12,2) not null check (max_fee >= base_fee),
 currency text not null default 'TWD' check (currency = 'TWD'),
 created_at timestamptz not null default now(),
 constraint group_buy_v2_fee_policy_unique_effective unique (effective_from)
);
insert into public.group_buy_v2_fee_policies(base_fee,per_order_fee,max_fee)
select 500,20,2500 where not exists(select 1 from public.group_buy_v2_fee_policies);
alter table public.group_buy_v2_fee_policies enable row level security;
revoke all on public.group_buy_v2_fee_policies from anon,authenticated;
alter table public.group_buy_proposals_v2
 add column if not exists fee_policy_id integer references public.group_buy_v2_fee_policies(id),
 add column if not exists fee_base_snapshot numeric(12,2),
 add column if not exists fee_per_order_snapshot numeric(12,2),
 add column if not exists fee_cap_snapshot numeric(12,2);
comment on column public.group_buy_proposals_v2.fee_policy_id is 'Capture approved fee policy at scheduling; no retroactive repricing of existing listings.';
comment on column public.group_buy_proposals_v2.fee_base_snapshot is 'TWD 500 initial fixed fee, charged once per listing under approved policy.';
comment on column public.group_buy_proposals_v2.fee_per_order_snapshot is 'TWD 20 per eligible completed order, not per purchased unit.';
comment on column public.group_buy_proposals_v2.fee_cap_snapshot is 'TWD 2500 total listing fee ceiling.';
-- Pure fee calculator; eligibility and refunds must be determined from audited order records, never supplied by sellers.
create or replace function public.group_buy_v2_calculate_fee(p_completed_orders integer,p_base numeric default 500,p_per_order numeric default 20,p_cap numeric default 2500)
returns numeric language sql immutable strict set search_path='' as $$
 select case when p_completed_orders < 0 or p_base < 0 or p_per_order < 0 or p_cap < p_base
 then null else least(p_cap,p_base+p_completed_orders*p_per_order) end
$$;
revoke all on function public.group_buy_v2_calculate_fee(integer,numeric,numeric,numeric) from public,anon,authenticated;
comment on function public.group_buy_v2_calculate_fee(integer,numeric,numeric,numeric) is 'Backoffice arithmetic only. A completed order with full refund must not be counted; partial refunds require explicit reconciliation.';
