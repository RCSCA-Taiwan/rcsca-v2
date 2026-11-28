-- Preserve verified capacity and prevent deletion from reopening issuance capacity.
create or replace function public.enterprise_stock_receipt_guard_v2()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if exists(select 1 from public.enterprise_reward_stock_v2 where receipt_id=old.id)
 or exists(select 1 from public.enterprise_service_vouchers where receipt_id=old.id) then
 raise exception 'Posted receipt is immutable';
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
create function public.enterprise_service_voucher_delete_guard_v2()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 raise exception 'Voucher history is immutable';
end $$;
create trigger enterprise_service_voucher_delete_guard_v2 before delete on public.enterprise_service_vouchers for each row execute function public.enterprise_service_voucher_delete_guard_v2();
revoke all on function public.enterprise_service_voucher_delete_guard_v2() from public,anon,authenticated,service_role;
-- Cancellation is a status transition, not deletion or capacity recreation.
