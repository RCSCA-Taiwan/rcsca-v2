-- Draft, backend-only. No automatic refund transfer or stock restocking.
create table public.group_buy_v2_disputes (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.group_buy_v2_orders(id),
 opened_by uuid not null references auth.users(id),
 reason text not null check(length(btrim(reason)) between 1 and 2000),
 status text not null default 'open' check(status in ('open','resolved')),
 resolved_by uuid references auth.users(id),
 resolved_at timestamptz,
 resolution text,
 created_at timestamptz not null default now(),
 check ((status='open' and resolved_by is null and resolved_at is null and resolution is null)
 or (status='resolved' and resolved_by is not null and resolved_at is not null and nullif(btrim(resolution),'') is not null))
);
create unique index group_buy_v2_one_open_dispute on public.group_buy_v2_disputes(order_id) where status='open';
create table public.group_buy_v2_refunds (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.group_buy_v2_orders(id),
 request_id uuid not null,
 product_amount numeric(14,2) not null check(product_amount>=0),
 shipping_amount numeric(14,2) not null check(shipping_amount>=0),
 reason text not null check(length(btrim(reason)) between 1 and 2000),
 requested_by uuid not null references auth.users(id),
 status text not null default 'pending' check(status in ('pending','paid','rejected')),
 created_at timestamptz not null default now(),
 check(product_amount+shipping_amount>0),
 unique(order_id,request_id)
);
alter table public.group_buy_v2_disputes enable row level security;
alter table public.group_buy_v2_refunds enable row level security;
revoke all on public.group_buy_v2_disputes,public.group_buy_v2_refunds from public,anon,authenticated,service_role;
-- Serialize all refund reservations against the same campaign and order.
create function public.group_buy_v2_request_refund(
 p_order uuid,p_request uuid,p_actor uuid,p_product numeric,p_shipping numeric,p_reason text
) returns uuid language plpgsql security invoker set search_path='' as $$
declare
 v_order public.group_buy_v2_orders%rowtype;
 v_existing public.group_buy_v2_refunds%rowtype;
 v_proposal uuid;
 v_product numeric;
 v_shipping numeric;
 v_id uuid;
begin
 if p_order is null or p_request is null or p_actor is null or p_product is null or p_shipping is null
 or p_product<0 or p_shipping<0 or p_product<>round(p_product,2) or p_shipping<>round(p_shipping,2)
 or p_product+p_shipping<=0 or p_reason is null or length(btrim(p_reason)) not between 1 and 2000 then
 raise exception 'Invalid refund request'; end if;
 select proposal_id into v_proposal from public.group_buy_v2_orders where id=p_order;
 if not found then raise exception 'Unknown order'; end if;
 perform 1 from public.group_buy_proposals_v2 where id=v_proposal for update;
 select * into strict v_order from public.group_buy_v2_orders where id=p_order for update;
 select * into v_existing from public.group_buy_v2_refunds where order_id=p_order and request_id=p_request;
 if found then
 if v_existing.requested_by<>p_actor or v_existing.product_amount<>p_product or v_existing.shipping_amount<>p_shipping or v_existing.reason<>p_reason then raise exception 'Idempotency conflict'; end if;
 return v_existing.id;
 end if;
 if v_order.status not in ('paid','shipped','delivered') then raise exception 'Order not refundable'; end if;
 if exists(select 1 from public.group_buy_v2_settlements where proposal_id=v_proposal and status in ('approved','paid')) then raise exception 'Settlement requires manual reconciliation'; end if;
 select coalesce(sum(product_amount),0),coalesce(sum(shipping_amount),0) into v_product,v_shipping
 from public.group_buy_v2_refunds where order_id=p_order and status in ('pending','paid');
 if v_product+p_product>v_order.product_total or v_shipping+p_shipping>v_order.shipping_fee then raise exception 'Refund exceeds receipts'; end if;
 insert into public.group_buy_v2_refunds(order_id,request_id,requested_by,product_amount,shipping_amount,reason)
 values(p_order,p_request,p_actor,p_product,p_shipping,p_reason) returning id into v_id;
 return v_id;
end $$;
revoke all on function public.group_buy_v2_request_refund(uuid,uuid,uuid,numeric,numeric,text) from public,anon,authenticated,service_role;
-- Read-only predicate; settlement approval must invoke under campaign lock.
create function public.group_buy_v2_has_settlement_hold(p_proposal uuid)
returns boolean language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.group_buy_v2_orders o join public.group_buy_v2_disputes d on d.order_id=o.id where o.proposal_id=p_proposal and d.status='open')
 or exists(select 1 from public.group_buy_v2_orders o join public.group_buy_v2_refunds r on r.order_id=o.id where o.proposal_id=p_proposal and r.status='pending')
$$;
revoke all on function public.group_buy_v2_has_settlement_hold(uuid) from public,anon,authenticated,service_role;
-- Refund completion, bank evidence, actor authorization and dispute transition RPCs remain pending.
