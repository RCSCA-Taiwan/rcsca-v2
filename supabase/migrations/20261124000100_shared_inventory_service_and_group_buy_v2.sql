-- RCSCA V2: additive foundation for independent enterprise sharing and group buys.
-- REVIEW REQUIRED before applying to production. Existing reward/order tables are untouched.
-- No automatic reward issuance, payments, shipping, or settlement is enabled.
create table if not exists public.enterprise_share_plans (
 id uuid primary key default gen_random_uuid(),
 enterprise_id uuid not null references public.enterprises(id),
 period_year integer not null check (period_year between 2026 and 2100),
 period_quarter integer check (period_quarter between 1 and 4),
 resource_type text not null check (resource_type in ('product','service')),
 title text not null check (length(btrim(title)) between 1 and 180),
 description text,
 redemption_copy text,
 reference_value_twd numeric(12,2) check (reference_value_twd is null or reference_value_twd >= 0),
 reference_value_evidence text,
 specification text,
 fulfillment_instructions text,
 valid_from date,
 valid_until date,
 suggested_points integer check (suggested_points is null or suggested_points > 0),
 approved_points integer check (approved_points is null or approved_points > 0),
 points_review_note text,
 committed_quantity integer not null check (committed_quantity > 0),
 intended_delivery_at date,
 service_terms jsonb not null default '{}'::jsonb check (jsonb_typeof(service_terms)='object'),
 status text not null default 'proposed' check (status in ('proposed','accepted','completed','withdrawn')),
 check (valid_until is null or valid_from is null or valid_until >= valid_from),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.enterprise_share_plan_images (
 id uuid primary key default gen_random_uuid(),
 plan_id uuid not null references public.enterprise_share_plans(id) on delete cascade,
 storage_path text not null,
 alt_text text not null default '',
 display_order smallint not null check (display_order between 1 and 5),
 created_at timestamptz not null default now(),
 unique(plan_id,display_order),
 unique(storage_path)
);
comment on table public.enterprise_share_plan_images is 'Private submitted media metadata; never assume image path is a public URL. Upload authorization and storage RLS required before enabling registration uploads.';
create index if not exists enterprise_share_plans_enterprise_period on public.enterprise_share_plans(enterprise_id,period_year,period_quarter);
comment on table public.enterprise_share_plans is 'Voluntary annual/quarterly commitments; never counted as available reward inventory before verification.';
create table if not exists public.enterprise_share_receipts (
 id uuid primary key default gen_random_uuid(),
 plan_id uuid not null references public.enterprise_share_plans(id),
 quantity integer not null check (quantity > 0),
 received_at timestamptz not null default now(),
 received_by uuid references auth.users(id),
 kind text not null check (kind in ('physical_stock','confirmed_service_capacity','preissued_voucher')),
 reference_note text,
 verified_at timestamptz,
 verified_by uuid references auth.users(id),
 created_at timestamptz not null default now(),
 check ((verified_at is null and verified_by is null) or (verified_at is not null and verified_by is not null))
);
create index if not exists enterprise_share_receipts_plan on public.enterprise_share_receipts(plan_id);
comment on table public.enterprise_share_receipts is 'Verified receipt records, not a direct spendable stock balance. Reward inventory is separately reserved transactionally.';
create table if not exists public.enterprise_service_vouchers (
 id uuid primary key default gen_random_uuid(),
 receipt_id uuid not null references public.enterprise_share_receipts(id),
 serial_number text not null unique,
 service_kind text not null check (service_kind in ('photography','lodging','appointment','event','other')),
 valid_from date,
 valid_until date,
 booking_conditions text not null,
 included_services text not null,
 mandatory_extra_fee numeric(12,2) not null default 0 check (mandatory_extra_fee=0),
 status text not null default 'available' check (status in ('available','reserved','issued','redeemed','expired','cancelled')),
 redeemed_at timestamptz,
 created_at timestamptz not null default now(),
 check (valid_until is null or valid_from is null or valid_until>=valid_from)
);
create index if not exists enterprise_service_vouchers_receipt_status on public.enterprise_service_vouchers(receipt_id,status);
comment on table public.enterprise_service_vouchers is 'Service entitlement inventory. Do not expose voucher serials publicly; issue via authenticated redemption flow only.';
create table if not exists public.group_buy_proposals_v2 (
 id uuid primary key default gen_random_uuid(),
 proposer_user_id uuid not null references auth.users(id),
 enterprise_id uuid references public.enterprises(id),
 title text not null check (length(btrim(title)) between 1 and 180),
 description text,
 item_type text not null default 'product' check (item_type in ('product','bundle','service')),
 retail_price numeric(12,2) not null check (retail_price>0),
 group_price numeric(12,2) not null check (group_price>0 and group_price<retail_price),
 quantity_limit integer not null check (quantity_limit in (50,100)),
 per_order_limit integer check (per_order_limit>0),
 shipping_config jsonb not null default '{}'::jsonb check (jsonb_typeof(shipping_config)='object'),
 fulfillment_terms text not null,
 return_terms text not null,
 status text not null default 'draft' check (status in ('draft','submitted','approved','rejected','scheduled','open','closed','cancelled')),
 scheduled_week date,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists group_buy_proposals_v2_status_week on public.group_buy_proposals_v2(status,scheduled_week);
comment on table public.group_buy_proposals_v2 is 'New independent member/enterprise group-buy proposals. Fees and payment settlement intentionally not specified.';
-- Fail closed until audited RPCs and explicit ownership/admin policies are implemented.
alter table public.enterprise_share_plans enable row level security;
alter table public.enterprise_share_plan_images enable row level security;
alter table public.enterprise_share_receipts enable row level security;
alter table public.enterprise_service_vouchers enable row level security;
alter table public.group_buy_proposals_v2 enable row level security;
revoke all on public.enterprise_share_plan_images,public.enterprise_share_plans,public.enterprise_share_receipts,public.enterprise_service_vouchers,public.group_buy_proposals_v2 from anon,authenticated;
-- Never publish unverified stock or private voucher numbers via public table grants.
