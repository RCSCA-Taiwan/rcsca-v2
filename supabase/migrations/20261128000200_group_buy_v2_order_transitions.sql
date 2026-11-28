-- Draft backend-only order transitions. Never expose to client roles.
alter table public.group_buy_v2_orders
 add column paid_at timestamptz,
 add column verified_by uuid references auth.users(id),
 add column payment_reference text,
 add column shipped_at timestamptz,
 add column delivered_at timestamptz,
 add column cancelled_at timestamptz;
create table public.group_buy_v2_order_events (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.group_buy_v2_orders(id),
 request_id uuid not null,
 actor_id uuid not null references auth.users(id),
 event text not null check(event in ('cancel','bank_verified','dispatch','confirm_delivery','expire')),
 resulting_status text not null,
 created_at timestamptz not null default now(),
 unique(order_id,request_id)
);
alter table public.group_buy_v2_order_events enable row level security;
revoke all on public.group_buy_v2_order_events from public,anon,authenticated;
-- Caller must verify staff authority for bank verification, seller authority for dispatch,
-- and buyer authority for cancellation/delivery. No API grants until integration.
create function public.group_buy_v2_transition(
 p_order uuid,p_request uuid,p_actor uuid,p_event text,p_amount numeric default null,p_reference text default null
) returns text language plpgsql security invoker set search_path='' as $$
declare
 v_order public.group_buy_v2_orders%rowtype;
 v_event public.group_buy_v2_order_events%rowtype;
 v_proposal uuid;
 v_next text;
 v_now timestamptz;
begin
 if p_order is null or p_request is null or p_actor is null or p_event is null then raise exception 'Invalid event'; end if;
 select proposal_id into v_proposal from public.group_buy_v2_orders where id=p_order;
 if not found then raise exception 'Unknown order'; end if;
 -- Same lock order as reservation: campaign first, order second.
 perform 1 from public.group_buy_proposals_v2 where id=v_proposal for update;
 select * into strict v_order from public.group_buy_v2_orders where id=p_order for update;
 select * into v_event from public.group_buy_v2_order_events where order_id=p_order and request_id=p_request;
 if found then
 if v_event.actor_id<>p_actor or v_event.event<>p_event then raise exception 'Idempotency conflict'; end if;
 if p_event='bank_verified' and (p_amount is distinct from v_order.product_total+v_order.shipping_fee or p_reference is distinct from v_order.payment_reference) then raise exception 'Idempotency conflict'; end if;
 return v_event.resulting_status;
 end if;
 v_now:=clock_timestamp();
 case p_event
 when 'cancel' then
 if v_order.status<>'reserved' or v_order.buyer_id<>p_actor then raise exception 'Forbidden cancellation'; end if;
 v_next:='cancelled';
 when 'expire' then
 if v_order.status<>'reserved' or v_order.expires_at>v_now then raise exception 'Not eligible for expiry'; end if;
 v_next:='expired';
 when 'bank_verified' then
 if v_order.status<>'reserved' or v_order.expires_at<=v_now or p_amount is distinct from v_order.product_total+v_order.shipping_fee or nullif(btrim(p_reference),'') is null then raise exception 'Invalid payment verification'; end if;
 v_next:='paid';
 when 'dispatch' then
 if v_order.status<>'paid' then raise exception 'Order not paid'; end if;
 v_next:='shipped';
 when 'confirm_delivery' then
 if v_order.status<>'shipped' or v_order.buyer_id<>p_actor then raise exception 'Forbidden delivery confirmation'; end if;
 v_next:='delivered';
 else raise exception 'Unknown event';
 end case;
 update public.group_buy_v2_orders set status=v_next,
 paid_at=case when v_next='paid' then v_now else paid_at end,
 verified_by=case when v_next='paid' then p_actor else verified_by end,
 payment_reference=case when v_next='paid' then p_reference else payment_reference end,
 shipped_at=case when v_next='shipped' then v_now else shipped_at end,
 delivered_at=case when v_next='delivered' then v_now else delivered_at end,
 cancelled_at=case when v_next='cancelled' then v_now else cancelled_at end
 where id=p_order;
 insert into public.group_buy_v2_order_events(order_id,request_id,actor_id,event,resulting_status)
 values(p_order,p_request,p_actor,p_event,v_next);
 return v_next;
end $$;
revoke all on function public.group_buy_v2_transition(uuid,uuid,uuid,text,numeric,text) from public,anon,authenticated,service_role;
