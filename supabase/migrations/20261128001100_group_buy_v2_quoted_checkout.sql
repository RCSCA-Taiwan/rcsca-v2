-- Internal integration only; membership eligibility and execution grants remain pending.
create function public.group_buy_v2_quoted_checkout(
 p_proposal uuid,p_request uuid,p_quantity integer,p_expires timestamptz,
 p_name text,p_phone text,p_method text,p_address text,p_chain text,p_store_code text,p_store_name text
) returns uuid language plpgsql security invoker set search_path='' as $$
declare
 v_actor uuid:=auth.uid();
 v_fee numeric;
 v_order public.group_buy_v2_orders%rowtype;
begin
 if v_actor is null or p_request is null or p_proposal is null then raise exception 'Authentication and request required'; end if;
 -- Match reservation lock ordering to avoid deadlocks on concurrent retries.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_actor::text||':'||p_request::text,0));
 select * into v_order from public.group_buy_v2_orders where buyer_id=v_actor and request_id=p_request;
 if found then
 if v_order.proposal_id<>p_proposal then raise exception 'Idempotency conflict'; end if;
 v_fee:=v_order.shipping_fee;
 else
 v_fee:=public.group_buy_v2_shipping_quote(p_proposal,p_method);
 end if;
 return public.group_buy_v2_checkout(p_proposal,v_actor,p_request,p_quantity,v_fee,p_expires,p_name,p_phone,p_method,p_address,p_chain,p_store_code,p_store_name);
end $$;
revoke all on function public.group_buy_v2_quoted_checkout(uuid,uuid,integer,timestamptz,text,text,text,text,text,text,text) from public,anon,authenticated,service_role;
-- No public entry point until membership, expiry policy and quote provisioning are verified.
