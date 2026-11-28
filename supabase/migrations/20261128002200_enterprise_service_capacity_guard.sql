-- Internal service inventory guard; no public issuance grants.
create function public.enterprise_service_capacity_guard_v2()
returns trigger language plpgsql security invoker set search_path='' as $$
declare r public.enterprise_share_receipts%rowtype; p public.enterprise_share_plans%rowtype; v_count bigint;
begin
 if tg_op='UPDATE' then
 if new.receipt_id<>old.receipt_id or new.serial_number<>old.serial_number then raise exception 'Voucher identity immutable'; end if;
 end if;
 select * into strict r from public.enterprise_share_receipts where id=new.receipt_id for update;
 select * into strict p from public.enterprise_share_plans where id=r.plan_id;
 if r.kind not in ('confirmed_service_capacity','preissued_voucher') or r.verified_at is null or r.verified_by is null or p.resource_type<>'service' or p.status not in ('accepted','completed') or p.approved_points is null then raise exception 'Service receipt not eligible'; end if;
 if (p.valid_from is not null and (new.valid_from is null or new.valid_from<p.valid_from)) or (p.valid_until is not null and (new.valid_until is null or new.valid_until>p.valid_until)) then raise exception 'Voucher validity exceeds plan'; end if;
 if tg_op='INSERT' then
 if new.status<>'available' or new.redeemed_at is not null then raise exception 'Invalid initial voucher status'; end if;
 select count(*) into v_count from public.enterprise_service_vouchers where receipt_id=r.id;
 if v_count>=r.quantity then raise exception 'Verified service capacity exhausted'; end if;
 end if;
 return new;
end $$;
create trigger enterprise_service_capacity_guard_v2 before insert or update on public.enterprise_service_vouchers for each row execute function public.enterprise_service_capacity_guard_v2();
revoke all on function public.enterprise_service_capacity_guard_v2() from public,anon,authenticated,service_role;
revoke all on public.enterprise_service_vouchers from public,anon,authenticated,service_role;
-- Status transitions, immutable receipt capacity, issuance and redemption authorization remain pending.
