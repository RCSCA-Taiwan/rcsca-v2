-- Draft transaction core; backend-only, not deployed.
create table public.group_buy_v2_orders (
 id uuid primary key default gen_random_uuid(),
 proposal_id uuid not null references public.group_buy_proposals_v2(id),
 buyer_id uuid not null references auth.users(id),
 request_id uuid not null,
 quantity integer not null check(quantity between 1 and 100),
 unit_price numeric(12,2) not null check(unit_price>0),
 shipping_fee numeric(12,2) not null check(shipping_fee>=0),
 product_total numeric(14,2) generated always as (quantity*unit_price) stored,
 status text not null default 'reserved' check(status in ('reserved','paid','shipped','delivered','cancelled','expired')),
 expires_at timestamptz not null,
 created_at timestamptz not null default now(),
 unique(buyer_id,request_id)
);
create index group_buy_v2_orders_stock on public.group_buy_v2_orders(proposal_id,status);
alter table public.group_buy_v2_orders enable row level security;
revoke all on public.group_buy_v2_orders from public,anon,authenticated;
-- Trusted backend must validate buyer eligibility and derive shipping fee from approved configuration.
-- All reservation writers must use this function; no direct client writes.
create function public.group_buy_v2_reserve(
 p_proposal uuid,p_buyer uuid,p_request uuid,p_quantity integer,p_shipping numeric,p_expires timestamptz
) returns uuid language plpgsql security invoker set search_path='' as $$
declare
 v_proposal public.group_buy_proposals_v2%rowtype;
 v_existing public.group_buy_v2_orders%rowtype;
 v_used bigint;
 v_id uuid;
begin
 if p_proposal is null or p_buyer is null or p_request is null or p_quantity is null
 or p_quantity not between 1 and 100 or p_shipping is null or p_shipping<0
 or p_shipping<>round(p_shipping,2) or p_expires is null then
 raise exception 'Invalid reservation';
 end if;
 -- Serialize retries across campaigns, then serialize stock for this campaign.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_buyer::text||':'||p_request::text,0));
 select * into v_existing from public.group_buy_v2_orders where buyer_id=p_buyer and request_id=p_request;
 if found then
 if v_existing.proposal_id<>p_proposal or v_existing.quantity<>p_quantity or v_existing.shipping_fee<>p_shipping then
 raise exception 'Idempotency conflict';
 end if;
 return v_existing.id;
 end if;
 select * into v_proposal from public.group_buy_proposals_v2 where id=p_proposal for update;
 if not found or v_proposal.status<>'open' then raise exception 'Campaign not open'; end if;
 if p_expires<=clock_timestamp() then raise exception 'Invalid expiry'; end if;
 if p_quantity>coalesce(v_proposal.per_order_limit,v_proposal.quantity_limit) then raise exception 'Order limit exceeded'; end if;
 update public.group_buy_v2_orders set status='expired'
 where proposal_id=p_proposal and status='reserved' and expires_at<=clock_timestamp();
 select coalesce(sum(quantity),0) into v_used from public.group_buy_v2_orders
 where proposal_id=p_proposal and status in ('reserved','paid','shipped','delivered');
 if v_used+p_quantity>v_proposal.quantity_limit then raise exception 'Insufficient stock'; end if;
 insert into public.group_buy_v2_orders(proposal_id,buyer_id,request_id,quantity,unit_price,shipping_fee,expires_at)
 values(p_proposal,p_buyer,p_request,p_quantity,v_proposal.group_price,p_shipping,p_expires) returning id into v_id;
 return v_id;
end $$;
revoke all on function public.group_buy_v2_reserve(uuid,uuid,uuid,integer,numeric,timestamptz) from public,anon,authenticated;
-- Keep execution disabled for API roles until trusted backend authorization and integration tests exist.
revoke all on function public.group_buy_v2_reserve(uuid,uuid,uuid,integer,numeric,timestamptz) from service_role;
