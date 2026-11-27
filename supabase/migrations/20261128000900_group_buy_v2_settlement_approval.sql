-- Draft only. No automatic transfer or API grants.
alter table public.group_buy_v2_settlements add column payout_reference text,
 add column payout_confirmed_by uuid references auth.users(id);
create unique index group_buy_v2_payout_reference_unique on public.group_buy_v2_settlements ((btrim(payout_reference))) where payout_reference is not null;
create unique index group_buy_v2_one_live_settlement on public.group_buy_v2_settlements(proposal_id) where status<>'void';
revoke all on public.group_buy_v2_settlements from public,anon,authenticated,service_role;
create function public.group_buy_v2_approve_settlement(p_id uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare
 v_actor uuid:=auth.uid(); v_proposal uuid;
 v_old public.group_buy_v2_settlements%rowtype;
 v_new public.group_buy_v2_settlements%rowtype;
 v_new_id uuid;
begin
 if v_actor is null or not exists(select 1 from public.group_buy_v2_staff_permissions where user_id=v_actor and permission='approve_settlement') then raise exception 'Forbidden'; end if;
 select proposal_id into v_proposal from public.group_buy_v2_settlements where id=p_id;
 if not found then raise exception 'Unknown settlement'; end if;
 perform 1 from public.group_buy_proposals_v2 where id=v_proposal for update;
 select * into strict v_old from public.group_buy_v2_settlements where id=p_id for update;
 if v_old.status='approved' and v_old.approved_by=v_actor then return; end if;
 if v_old.status not in ('draft','under_review') or v_old.net_payout<0 or v_old.other_agreed_deductions<>0 then raise exception 'Settlement requires reconciliation'; end if;
 -- Shipping reconciliation is not yet implemented; fail closed for nonzero shipping.
 if exists(select 1 from public.group_buy_v2_orders where proposal_id=v_proposal and paid_at is not null and shipping_fee<>0) then raise exception 'Shipping reconciliation required'; end if;
 update public.group_buy_v2_settlements set status='void' where id=p_id;
 v_new_id:=public.group_buy_v2_create_settlement_draft(v_proposal);
 select * into strict v_new from public.group_buy_v2_settlements where id=v_new_id;
 if v_new.status<>'draft' or row(v_old.eligible_order_count,v_old.gross_product_receipts,v_old.refunded_product_amount,v_old.base_fee,v_old.per_order_fee,v_old.net_payout)
 is distinct from row(v_new.eligible_order_count,v_new.gross_product_receipts,v_new.refunded_product_amount,v_new.base_fee,v_new.per_order_fee,v_new.net_payout)
 then raise exception 'Settlement changed; regenerate draft'; end if;
 delete from public.group_buy_v2_settlements where id=v_new_id;
 update public.group_buy_v2_settlements set status='approved',approved_by=v_actor,approved_at=clock_timestamp() where id=p_id;
end $$;
create function public.group_buy_v2_confirm_payout(p_id uuid,p_amount numeric,p_reference text)
returns void language plpgsql security invoker set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_proposal uuid; v_s public.group_buy_v2_settlements%rowtype;
begin
 if v_actor is null or not exists(select 1 from public.group_buy_v2_staff_permissions where user_id=v_actor and permission='approve_settlement') then raise exception 'Forbidden'; end if;
 if p_amount is null or p_amount<0 or nullif(btrim(p_reference),'') is null then raise exception 'Invalid payout evidence'; end if;
 select proposal_id into v_proposal from public.group_buy_v2_settlements where id=p_id;
 if not found then raise exception 'Unknown settlement'; end if;
 perform 1 from public.group_buy_proposals_v2 where id=v_proposal for update;
 select * into strict v_s from public.group_buy_v2_settlements where id=p_id for update;
 if v_s.status='paid' and v_s.payout_confirmed_by=v_actor and v_s.payout_reference=btrim(p_reference) and v_s.net_payout=p_amount then return; end if;
 if v_s.status<>'approved' or v_s.approved_by is null or v_s.approved_at is null or v_s.net_payout<>p_amount or public.group_buy_v2_has_settlement_hold(v_proposal) then raise exception 'Payout not eligible'; end if;
 update public.group_buy_v2_settlements set status='paid',paid_at=clock_timestamp(),payout_reference=btrim(p_reference),payout_confirmed_by=v_actor where id=p_id;
end $$;
revoke all on function public.group_buy_v2_approve_settlement(uuid),public.group_buy_v2_confirm_payout(uuid,numeric,text) from public,anon,authenticated,service_role;
-- Separate staff permissions, zero-payout closure and immutable payout audit require further integration.
