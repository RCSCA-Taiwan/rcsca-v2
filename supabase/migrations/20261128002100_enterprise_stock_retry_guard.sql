create or replace function public.enterprise_stock_reserve_v2(p_user uuid,p_request uuid,p_reward uuid,p_quantity integer)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_id uuid; v_old public.enterprise_stock_reservations_v2%rowtype; v_left integer; v_take integer; b record;
begin
 if p_user is null or p_request is null or p_reward is null or p_quantity is null or p_quantity<=0 then raise exception 'Invalid reservation'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('enterprise-stock:'||p_user::text||':'||p_request::text,0));
 select * into v_old from public.enterprise_stock_reservations_v2 where user_id=p_user and request_id=p_request;
 if found then
 select * into strict v_old from public.enterprise_stock_reservations_v2 where id=v_old.id for update;
 if v_old.released_at is not null then raise exception 'Reservation already released'; end if;
 if v_old.reward_id<>p_reward or v_old.quantity<>p_quantity then raise exception 'Reservation request mismatch'; end if;
 return v_old.id;
 end if;
 perform 1 from public.reward_catalog where id=p_reward and status='approved' for update;
 if not found then raise exception 'Reward unavailable'; end if;
 insert into public.enterprise_stock_reservations_v2(user_id,request_id,reward_id,quantity) values(p_user,p_request,p_reward,p_quantity) returning id into v_id;
 v_left:=p_quantity;
 for b in select s.receipt_id,s.available_quantity
 from public.enterprise_reward_stock_catalog_v2 l
 join public.enterprise_reward_stock_v2 s on s.receipt_id=l.receipt_id
 join public.enterprise_share_receipts r on r.id=s.receipt_id
 join public.enterprise_share_plans p on p.id=r.plan_id
 join public.reward_catalog c on c.id=l.reward_id
 where l.reward_id=p_reward and c.status='approved' and c.point_cost=s.points_per_unit
 and p.status in ('accepted','completed') and r.verified_at is not null and r.verified_by is not null
 and s.available_quantity>0
 and (p.valid_from is null or p.valid_from<=(now() at time zone 'Asia/Taipei')::date)
 and (p.valid_until is null or p.valid_until>=(now() at time zone 'Asia/Taipei')::date)
 and (c.starts_at is null or c.starts_at<=now()) and (c.ends_at is null or c.ends_at>now())
 order by p.valid_until nulls last,s.receipt_id for update of s
 loop
 v_take:=least(v_left,b.available_quantity);
 update public.enterprise_reward_stock_v2 set available_quantity=available_quantity-v_take where receipt_id=b.receipt_id;
 insert into public.enterprise_stock_allocations_v2 values(v_id,b.receipt_id,v_take);
 v_left:=v_left-v_take;
 exit when v_left=0;
 end loop;
 if v_left<>0 then raise exception 'Insufficient verified stock'; end if;
 return v_id;
end $$;
revoke all on function public.enterprise_stock_reserve_v2(uuid,uuid,uuid,integer) from public,anon,authenticated,service_role;
-- No standalone checkout grants: membership, points debit, cancellation and legacy catalog reconciliation pending.
