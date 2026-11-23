-- Draft policy amendment, NOT deployed.
-- Individual members: TWD 1,000 per offer, no per-order fee, two physical items for rewards.
-- Enterprise/shop: unchanged TWD 500 + TWD 30 per eligible completed order.
alter table public.group_buy_proposals_v2
 add column if not exists proposer_category text
  check(proposer_category in ('enterprise_shop','individual_member')),
 add column if not exists required_reward_item_quantity integer
  check(required_reward_item_quantity in (0,2));
comment on column public.group_buy_proposals_v2.proposer_category is 'Server-verified proposer classification, frozen on approval; never trust a client-selected fee category.';
comment on column public.group_buy_proposals_v2.required_reward_item_quantity is 'For individual_member 2 physical redeemable units; enterprise_shop 0. Actual inventory requires receipt verification.';

create table if not exists public.group_buy_v2_reward_contributions (
 id uuid primary key default gen_random_uuid(),
 proposal_id uuid not null references public.group_buy_proposals_v2(id),
 item_title text not null check(length(btrim(item_title)) between 1 and 180),
 item_description text,
 reference_value_twd numeric(12,2) check(reference_value_twd is null or reference_value_twd >= 0),
 quantity integer not null check(quantity > 0),
 received_quantity integer not null default 0 check(received_quantity >= 0),
 verified_quantity integer not null default 0 check(verified_quantity >= 0),
 review_status text not null default 'proposed' check(review_status in ('proposed','received','verified','rejected')),
 verified_by uuid references auth.users(id),
 verified_at timestamptz,
 created_at timestamptz not null default now(),
 check(verified_quantity <= received_quantity and received_quantity <= quantity),
 check((verified_at is null and verified_by is null) or (verified_at is not null and verified_by is not null))
);
create index if not exists group_buy_v2_reward_contributions_proposal on public.group_buy_v2_reward_contributions(proposal_id);
comment on table public.group_buy_v2_reward_contributions is 'Individual member group-buy physical reward contributions; 2 verified units required before qualifying for reward inventory. Separate inventory transaction integration required.';
alter table public.group_buy_v2_reward_contributions enable row level security;
revoke all on public.group_buy_v2_reward_contributions from anon,authenticated;

-- No automatic insert of two items, no automatic reward publication.
-- The server-side approval RPC must validate verified totals and proposer identity.
