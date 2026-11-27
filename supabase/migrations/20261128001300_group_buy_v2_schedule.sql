-- Internal draft only; no execution grants until staff and membership integration.
create function public.group_buy_v2_schedule(p_proposal uuid,p_week date)
returns smallint language plpgsql security invoker set search_path='' as $$
declare v_p public.group_buy_proposals_v2%rowtype; v_slot smallint;
begin
 if p_week is null or extract(isodow from p_week)<>1 then raise exception 'Invalid campaign week'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('group-buy-week:'||p_week::text,0));
 select * into v_p from public.group_buy_proposals_v2 where id=p_proposal for update;
 if not found then raise exception 'Unknown campaign'; end if;
 if v_p.status='scheduled' and v_p.scheduled_week=p_week then return v_p.weekly_slot; end if;
 if v_p.status<>'approved' then raise exception 'Campaign not approved'; end if;
 if v_p.item_type not in ('product','bundle') then raise exception 'Invalid campaign item'; end if;
 if not coalesce((v_p.proposer_category='enterprise_shop' and v_p.fee_base_snapshot=2000 and v_p.fee_per_order_snapshot=20 and v_p.required_reward_item_quantity=0) or
 (v_p.proposer_category='individual_member' and v_p.fee_base_snapshot=1000 and v_p.fee_per_order_snapshot=0 and v_p.required_reward_item_quantity=2),false) then raise exception 'Invalid fee snapshot'; end if;
 if v_p.proposer_category='individual_member' and
 (select coalesce(sum(verified_quantity),0) from public.group_buy_v2_reward_contributions where proposal_id=p_proposal and review_status='verified' and verified_by is not null and verified_at is not null)<2
 then raise exception 'Reward contributions not verified'; end if;
 select s into v_slot from pg_catalog.generate_series(1,3) s where not exists
 (select 1 from public.group_buy_proposals_v2 p where p.scheduled_week=p_week and p.weekly_slot=s and p.status in ('scheduled','open','closed')) order by s limit 1;
 if v_slot is null then raise exception 'Weekly capacity exhausted'; end if;
 update public.group_buy_proposals_v2 set status='scheduled',scheduled_week=p_week,weekly_slot=v_slot,updated_at=clock_timestamp() where id=p_proposal;
 return v_slot;
end $$;
revoke all on function public.group_buy_v2_schedule(uuid,date) from public,anon,authenticated,service_role;
-- Approval must separately establish active membership and staff authorization before this function is exposed.
