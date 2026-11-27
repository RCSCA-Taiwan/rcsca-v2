-- Draft internal checkout; no API grants. Trusted caller must verify buyer and shipping quote.
create function public.group_buy_v2_checkout(
 p_proposal uuid,p_buyer uuid,p_request uuid,p_quantity integer,p_shipping numeric,p_expires timestamptz,
 p_name text,p_phone text,p_method text,p_address text,p_chain text,p_store_code text,p_store_name text
) returns uuid language plpgsql security invoker set search_path='' as $$
declare
 v_id uuid;
 v_f public.group_buy_v2_fulfillment%rowtype;
begin
 v_id:=public.group_buy_v2_reserve(p_proposal,p_buyer,p_request,p_quantity,p_shipping,p_expires);
 -- Reservation and fulfillment are committed or rolled back together.
 insert into public.group_buy_v2_fulfillment(order_id,recipient_name,recipient_phone,method,address,store_chain,store_code,store_name)
 values(v_id,p_name,p_phone,p_method,p_address,p_chain,p_store_code,p_store_name)
 on conflict(order_id) do nothing;
 select * into strict v_f from public.group_buy_v2_fulfillment where order_id=v_id for update;
 if row(v_f.recipient_name,v_f.recipient_phone,v_f.method,v_f.address,v_f.store_chain,v_f.store_code,v_f.store_name)
 is distinct from row(p_name,p_phone,p_method,p_address,p_chain,p_store_code,p_store_name)
 then raise exception 'Checkout idempotency conflict'; end if;
 return v_id;
end $$;
revoke all on function public.group_buy_v2_checkout(uuid,uuid,uuid,integer,numeric,timestamptz,text,text,text,text,text,text,text) from public,anon,authenticated,service_role;
-- Explicitly close direct access to transaction tables, including default service grants.
revoke all on public.group_buy_v2_orders,public.group_buy_v2_order_events from public,anon,authenticated,service_role;
-- Existing reservation-only draft orders require reconciliation before activation.
