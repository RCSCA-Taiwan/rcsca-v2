-- Internal mapping only. Existing catalog and wallet transactions remain unchanged.
create table public.enterprise_reward_stock_catalog_v2 (
 receipt_id uuid primary key references public.enterprise_reward_stock_v2(receipt_id),
 reward_id uuid not null references public.reward_catalog(id),
 linked_at timestamptz not null default now(),
 linked_by uuid not null references auth.users(id)
);
create index enterprise_reward_stock_catalog_reward_v2 on public.enterprise_reward_stock_catalog_v2(reward_id);
alter table public.enterprise_reward_stock_catalog_v2 enable row level security;
revoke all on public.enterprise_reward_stock_catalog_v2 from public,anon,authenticated,service_role;
-- Multiple verified batches may map to a catalog item. Publication and reservation
-- must use the same authoritative stock transaction; never sum this into legacy stock blindly.
