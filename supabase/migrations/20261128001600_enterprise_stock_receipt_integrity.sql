-- Internal draft. Preserve the source of posted inventory.
create function public.enterprise_stock_receipt_guard_v2()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if exists(select 1 from public.enterprise_reward_stock_v2 where receipt_id=old.id) then
   raise exception 'Posted receipt is immutable';
 end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
create trigger enterprise_stock_receipt_guard_v2
 before update or delete on public.enterprise_share_receipts
 for each row execute function public.enterprise_stock_receipt_guard_v2();
revoke all on function public.enterprise_stock_receipt_guard_v2() from public,anon,authenticated,service_role;
revoke all on public.enterprise_share_receipts from public,anon,authenticated,service_role;
-- Corrections require a separately audited stock adjustment, not editing posted receipts.
