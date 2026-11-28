-- Internal primitive: do not expose until payment and fulfillment integration is verified.
create function public.enterprise_service_redeem_v2(p_voucher uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_enterprise uuid; v_status text; v_assignment uuid;
begin
 if v_actor is null then raise exception 'Authentication required'; end if;
 select p.enterprise_id,v.status::text into v_enterprise,v_status
 from public.enterprise_service_vouchers v
 join public.enterprise_share_receipts r on r.id=v.receipt_id
 join public.enterprise_share_plans p on p.id=r.plan_id
 where v.id=p_voucher for update of v;
 if not found then raise exception 'Voucher unavailable'; end if;
 if not exists(select 1 from public.enterprise_users e where e.enterprise_id=v_enterprise and e.user_id=v_actor) then raise exception 'Voucher unavailable'; end if;
 select id into v_assignment from public.enterprise_service_assignments_v2 where voucher_id=p_voucher and released_at is null for update;
 if not found then raise exception 'Active assignment required'; end if;
 if v_status='redeemed' then return v_assignment; end if;
 if v_status<>'issued' then raise exception 'Voucher not issued'; end if;
 update public.enterprise_service_vouchers set status='redeemed' where id=p_voucher;
 return v_assignment;
end $$;
revoke all on function public.enterprise_service_redeem_v2(uuid) from public,anon,authenticated,service_role;
-- Enterprise association is necessary but not sufficient for public authorization.
-- Explicit staff permissions, payment confirmation and audit actor remain launch gates.
