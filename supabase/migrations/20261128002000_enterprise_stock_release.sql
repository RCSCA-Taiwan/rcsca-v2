-- Internal cancellation primitive; points reversal must share this transaction.
alter table public.enterprise_stock_reservations_v2 add column released_at timestamptz;
create function public.enterprise_stock_release_v2(p_reservation uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare v_r public.enterprise_stock_reservations_v2%rowtype; v_reward uuid; b record;
begin
 select reward_id into v_reward from public.enterprise_stock_reservations_v2 where id=p_reservation;
 if not found then raise exception 'Unknown reservation'; end if;
 perform 1 from public.reward_catalog where id=v_reward for update;
 select * into strict v_r from public.enterprise_stock_reservations_v2 where id=p_reservation for update;
 if v_r.released_at is not null then return; end if;
 if (select coalesce(sum(quantity),0) from public.enterprise_stock_allocations_v2 where reservation_id=p_reservation)<>v_r.quantity then raise exception 'Allocation mismatch'; end if;
 for b in select receipt_id,quantity from public.enterprise_stock_allocations_v2 where reservation_id=p_reservation order by receipt_id loop
 update public.enterprise_reward_stock_v2 set available_quantity=available_quantity+b.quantity where receipt_id=b.receipt_id;
 if not found then raise exception 'Missing stock batch'; end if;
 end loop;
 update public.enterprise_stock_reservations_v2 set released_at=clock_timestamp() where id=p_reservation;
end $$;
revoke all on function public.enterprise_stock_release_v2(uuid) from public,anon,authenticated,service_role;
-- Released requests remain recorded and must never be treated as fresh reservations.
-- Fulfillment state and points reversal must be validated by the future orchestrator.
