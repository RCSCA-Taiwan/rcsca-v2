-- Draft only. No client access or production activation.
create table public.group_buy_v2_fulfillment (
 order_id uuid primary key references public.group_buy_v2_orders(id),
 recipient_name text not null check(length(btrim(recipient_name)) between 1 and 100),
 recipient_phone text not null check(length(btrim(recipient_phone)) between 5 and 32),
 method text not null check(method in ('home','convenience_store')),
 address text,
 store_chain text,
 store_code text,
 store_name text,
 carrier text,
 tracking_number text,
 created_at timestamptz not null default now(),
 check (
 (method='home' and nullif(btrim(address),'') is not null and store_chain is null and store_code is null and store_name is null)
 or (method='convenience_store' and address is null and nullif(btrim(store_chain),'') is not null and nullif(btrim(store_code),'') is not null and nullif(btrim(store_name),'') is not null)
 ),
 check ((carrier is null and tracking_number is null) or
 (nullif(btrim(carrier),'') is not null and nullif(btrim(tracking_number),'') is not null))
);
alter table public.group_buy_v2_fulfillment enable row level security;
revoke all on public.group_buy_v2_fulfillment from public,anon,authenticated,service_role;
-- Reference must be a canonical unique bank transaction identifier, not the buyer's last five digits.
create unique index group_buy_v2_unique_payment_reference
 on public.group_buy_v2_orders ((btrim(payment_reference)))
 where payment_reference is not null;
create table public.group_buy_v2_payment_reports (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.group_buy_v2_orders(id),
 request_id uuid not null,
 reported_amount numeric(14,2) not null check(reported_amount>0),
 transferred_at timestamptz not null,
 account_suffix text check(account_suffix ~ '^[0-9]{5}$'),
 private_evidence_path text,
 created_at timestamptz not null default now(),
 unique(order_id,request_id)
);
alter table public.group_buy_v2_payment_reports enable row level security;
revoke all on public.group_buy_v2_payment_reports from public,anon,authenticated,service_role;
comment on table public.group_buy_v2_payment_reports is 'Unverified buyer reports only; never automatically mark paid. Evidence storage authorization is pending.';
comment on table public.group_buy_v2_fulfillment is 'Private recipient data. Trusted backend must check paid status and verified seller ownership before disclosure. Atomic checkout and dispatch integration pending.';
