-- Draft internal operations; no API grants.
alter table public.group_buy_v2_refunds
 add column reviewed_by uuid references auth.users(id),
 add column reviewed_at timestamptz,
 add column review_note text,
 add column refund_bank_reference text,
 add constraint group_buy_v2_refund_review_check check (
 (status='pending' and reviewed_by is null and reviewed_at is null and refund_bank_reference is null)
 or (status='rejected' and reviewed_by is not null and reviewed_at is not null and nullif(btrim(review_note),'') is not null and refund_bank_reference is null)
 or (status='paid' and reviewed_by is not null and reviewed_at is not null and nullif(btrim(refund_bank_reference),'') is not null));
create unique index group_buy_v2_refund_bank_unique on public.group_buy_v2_refunds ((btrim(refund_bank_reference))) where refund_bank_reference is not null;
create function public.group_buy_v2_review_refund(p_refund uuid,p_decision text,p_note text,p_reference text default null)
returns text language plpgsql security invoker set search_path='' as $$
declare
 v_actor uuid:=auth.uid();
 v_proposal uuid;
 v_refund public.group_buy_v2_refunds%rowtype;
begin
 if v_actor is null or not exists(select 1 from public.group_buy_v2_staff_permissions where user_id=v_actor and permission='review_refund') then raise exception 'Forbidden'; end if;
 if p_decision is null or p_decision not in ('paid','rejected') or nullif(btrim(p_note),'') is null
 or (p_decision='paid' and nullif(btrim(p_reference),'') is null)
 or (p_decision='rejected' and p_reference is not null) then raise exception 'Invalid review'; end if;
 select o.proposal_id into v_proposal from public.group_buy_v2_refunds r join public.group_buy_v2_orders o on o.id=r.order_id where r.id=p_refund;
 if not found then raise exception 'Unknown refund'; end if;
 perform 1 from public.group_buy_proposals_v2 where id=v_proposal for update;
 select * into strict v_refund from public.group_buy_v2_refunds where id=p_refund for update;
 if v_refund.status<>'pending' then
 if v_refund.status=p_decision and v_refund.reviewed_by=v_actor and v_refund.review_note=p_note and v_refund.refund_bank_reference is not distinct from btrim(p_reference) then return v_refund.status; end if;
 raise exception 'Refund already reviewed'; end if;
 if exists(select 1 from public.group_buy_v2_settlements where proposal_id=v_proposal and status in ('approved','paid')) then raise exception 'Manual reconciliation required'; end if;
 update public.group_buy_v2_refunds set status=p_decision,reviewed_by=v_actor,reviewed_at=clock_timestamp(),review_note=p_note,refund_bank_reference=btrim(p_reference) where id=p_refund;
 update public.group_buy_v2_settlements set status='void',hold_reason='Refund changed; regenerate draft' where proposal_id=v_proposal and status in ('draft','under_review','held');
 return p_decision;
end $$;
create function public.group_buy_v2_resolve_dispute(p_dispute uuid,p_resolution text)
returns void language plpgsql security invoker set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_proposal uuid; v_dispute public.group_buy_v2_disputes%rowtype;
begin
 if v_actor is null or not exists(select 1 from public.group_buy_v2_staff_permissions where user_id=v_actor and permission='resolve_dispute') then raise exception 'Forbidden'; end if;
 if nullif(btrim(p_resolution),'') is null then raise exception 'Resolution required'; end if;
 select o.proposal_id into v_proposal from public.group_buy_v2_disputes d join public.group_buy_v2_orders o on o.id=d.order_id where d.id=p_dispute;
 if not found then raise exception 'Unknown dispute'; end if;
 perform 1 from public.group_buy_proposals_v2 where id=v_proposal for update;
 select * into strict v_dispute from public.group_buy_v2_disputes where id=p_dispute for update;
 if v_dispute.status='resolved' then
 if v_dispute.resolved_by=v_actor and v_dispute.resolution=p_resolution then return; end if;
 raise exception 'Dispute already resolved'; end if;
 if exists(select 1 from public.group_buy_v2_refunds where order_id=v_dispute.order_id and status='pending') then raise exception 'Pending refund'; end if;
 if exists(select 1 from public.group_buy_v2_settlements where proposal_id=v_proposal and status in ('approved','paid')) then raise exception 'Manual reconciliation required'; end if;
 update public.group_buy_v2_disputes set status='resolved',resolved_by=v_actor,resolved_at=clock_timestamp(),resolution=p_resolution where id=p_dispute;
 update public.group_buy_v2_settlements set status='void',hold_reason='Dispute changed; regenerate draft' where proposal_id=v_proposal and status in ('draft','under_review','held');
end $$;
revoke all on function public.group_buy_v2_review_refund(uuid,text,text,text),public.group_buy_v2_resolve_dispute(uuid,text) from public,anon,authenticated,service_role;
