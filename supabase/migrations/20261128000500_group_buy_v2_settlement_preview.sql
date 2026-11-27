-- Draft calculation only; no payout authorization or bank transfer.
alter table public.group_buy_v2_orders add column dispute_window_closed_at timestamptz;
create function public.group_buy_v2_create_settlement_draft(p_proposal uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare
 v_p public.group_buy_proposals_v2%rowtype;
 v_gross numeric;
 v_refund numeric;
 v_count integer;
 v_version integer;
 v_id uuid;
begin
 select * into v_p from public.group_buy_proposals_v2 where id=p_proposal for update;
 if not found or v_p.status<>'closed' then raise exception 'Campaign must be closed'; end if;
 if not coalesce(
 (v_p.proposer_category='enterprise_shop' and v_p.fee_base_snapshot=2000 and v_p.fee_per_order_snapshot=20)
 or (v_p.proposer_category='individual_member' and v_p.fee_base_snapshot=1000 and v_p.fee_per_order_snapshot=0),false)
 then raise exception 'Invalid fee snapshot'; end if;
 if exists(select 1 from public.group_buy_v2_settlements where proposal_id=p_proposal and status<>'void')
 then raise exception 'Existing settlement requires reconciliation'; end if;
 if public.group_buy_v2_has_settlement_hold(p_proposal) then raise exception 'Unresolved refund or dispute'; end if;
 if exists(select 1 from public.group_buy_v2_orders where proposal_id=p_proposal and
 (status in ('reserved','paid','shipped') or (status='delivered' and
 (paid_at is null or verified_by is null or payment_reference is null or delivered_at is null
 or dispute_window_closed_at is null or dispute_window_closed_at<delivered_at or dispute_window_closed_at>clock_timestamp()))))
 then raise exception 'Unresolved order'; end if;
 select coalesce(sum(o.product_total),0),coalesce(sum(coalesce(r.amount,0)),0),
 count(*) filter(where o.product_total>coalesce(r.amount,0))
 into v_gross,v_refund,v_count
 from public.group_buy_v2_orders o
 left join lateral (select sum(product_amount) amount from public.group_buy_v2_refunds where order_id=o.id and status='paid') r on true
 where o.proposal_id=p_proposal and o.status='delivered';
 if v_refund>v_gross then raise exception 'Invalid refund totals'; end if;
 select coalesce(max(version),0)+1 into v_version from public.group_buy_v2_settlements where proposal_id=p_proposal;
 insert into public.group_buy_v2_settlements(proposal_id,version,status,eligible_order_count,gross_product_receipts,refunded_product_amount,base_fee,per_order_fee,hold_reason)
 values(p_proposal,v_version,case when v_gross-v_refund-v_p.fee_base_snapshot-v_count*v_p.fee_per_order_snapshot<0 then 'held' else 'draft' end,
 v_count,v_gross,v_refund,v_p.fee_base_snapshot,v_p.fee_per_order_snapshot,
 case when v_gross-v_refund-v_p.fee_base_snapshot-v_count*v_p.fee_per_order_snapshot<0 then 'Negative payout requires manual reconciliation' end)
 returning id into v_id;
 return v_id;
end $$;
revoke all on function public.group_buy_v2_create_settlement_draft(uuid) from public,anon,authenticated,service_role;
-- Dispute-window duration, trusted closure, shipping reconciliation and payout approval remain disabled.
