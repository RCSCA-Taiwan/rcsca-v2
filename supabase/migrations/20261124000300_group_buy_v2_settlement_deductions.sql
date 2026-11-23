-- Draft, additive: settlement ledger for fee deductions at payout, never up-front collection.
-- Do not apply until order eligibility, refunds, permissions, and approval workflow are integrated.
create table if not exists public.group_buy_v2_settlements (
 id uuid primary key default gen_random_uuid(),
 proposal_id uuid not null references public.group_buy_proposals_v2(id),
 version integer not null check(version > 0),
 status text not null default 'draft' check(status in ('draft','under_review','approved','paid','held','void')),
 eligible_order_count integer not null check(eligible_order_count >= 0),
 gross_product_receipts numeric(14,2) not null check(gross_product_receipts >= 0),
 refunded_product_amount numeric(14,2) not null default 0 check(refunded_product_amount >= 0),
 other_agreed_deductions numeric(14,2) not null default 0 check(other_agreed_deductions >= 0),
 base_fee numeric(12,2) not null default 500 check(base_fee >= 0),
 per_order_fee numeric(12,2) not null default 30 check(per_order_fee >= 0),
 service_fee numeric(14,2) generated always as (base_fee + per_order_fee * eligible_order_count) stored,
 net_payout numeric(14,2) generated always as (gross_product_receipts - refunded_product_amount - other_agreed_deductions - base_fee - per_order_fee * eligible_order_count) stored,
 hold_reason text,
 approved_by uuid references auth.users(id),
 approved_at timestamptz,
 paid_at timestamptz,
 created_at timestamptz not null default now(),
 unique(proposal_id,version),
 check(refunded_product_amount <= gross_product_receipts),
 check(status not in ('approved','paid') or (gross_product_receipts - refunded_product_amount - other_agreed_deductions - base_fee - per_order_fee * eligible_order_count) >= 0),
 check(status <> 'paid' or (approved_at is not null and approved_by is not null and paid_at is not null))
);
create index if not exists group_buy_v2_settlements_proposal_status on public.group_buy_v2_settlements(proposal_id,status);
comment on table public.group_buy_v2_settlements is 'Settlement draft only. Fees are withheld from final seller payout; no separate fee invoice or automatic bank transfer. Order counts must be reconciled from confirmed transactions.';
alter table public.group_buy_v2_settlements enable row level security;
revoke all on public.group_buy_v2_settlements from anon,authenticated;
