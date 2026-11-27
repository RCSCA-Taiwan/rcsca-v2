-- Draft fixed per-order shipping quote. Other pricing models require explicit policy.
create table public.group_buy_v2_shipping_quotes (
 proposal_id uuid not null references public.group_buy_proposals_v2(id),
 method text not null check(method in ('home','convenience_store')),
 fee numeric(12,2) not null check(fee>=0),
 primary key(proposal_id,method)
);
alter table public.group_buy_v2_shipping_quotes enable row level security;
revoke all on public.group_buy_v2_shipping_quotes from public,anon,authenticated,service_role;
create function public.group_buy_v2_shipping_quote(p_proposal uuid,p_method text)
returns numeric language plpgsql security invoker set search_path='' as $$
declare v_fee numeric;
begin
 perform 1 from public.group_buy_proposals_v2 where id=p_proposal and status='open' for update;
 if not found then raise exception 'Campaign not open'; end if;
 select fee into v_fee from public.group_buy_v2_shipping_quotes where proposal_id=p_proposal and method=p_method;
 if not found then raise exception 'Shipping method unavailable'; end if;
 return v_fee;
end $$;
create function public.group_buy_v2_seller_fulfillment(p_order uuid)
returns table(recipient_name text,recipient_phone text,method text,address text,store_chain text,store_code text,store_name text,carrier text,tracking_number text)
language plpgsql security invoker set search_path='' as $$
declare v_actor uuid:=auth.uid();
begin
 if v_actor is null then raise exception 'Forbidden'; end if;
 return query select f.recipient_name,f.recipient_phone,f.method,f.address,f.store_chain,f.store_code,f.store_name,f.carrier,f.tracking_number
 from public.group_buy_v2_fulfillment f join public.group_buy_v2_orders o on o.id=f.order_id
 join public.group_buy_proposals_v2 p on p.id=o.proposal_id
 where o.id=p_order and p.proposer_user_id=v_actor and o.status in ('paid','shipped')
 and o.paid_at is not null and o.verified_by is not null and o.payment_reference is not null
 and not exists(select 1 from public.group_buy_v2_refunds r where r.order_id=o.id and r.status in ('pending','paid'));
end $$;
revoke all on function public.group_buy_v2_shipping_quote(uuid,text),public.group_buy_v2_seller_fulfillment(uuid) from public,anon,authenticated,service_role;
-- Quote provisioning and immutability, buyer eligibility, checkout integration, and execution roles remain pending.
