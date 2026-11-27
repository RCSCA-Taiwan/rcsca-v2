create function public.enterprise_service_transition_guard_v2()
returns trigger language plpgsql security invoker set search_path='' as $$
declare v_active boolean;
begin
 if new.status=old.status then
 if new.redeemed_at is distinct from old.redeemed_at then raise exception 'Redemption timestamp immutable'; end if;
 return new;
 end if;
 if not ((old.status='available' and new.status in ('reserved','expired','cancelled'))
 or (old.status='reserved' and new.status in ('available','issued','expired','cancelled'))
 or (old.status='issued' and new.status in ('redeemed','expired','cancelled'))) then
 raise exception 'Invalid voucher transition';
 end if;
 select exists(select 1 from public.enterprise_service_assignments_v2 where voucher_id=old.id and released_at is null) into v_active;
 if new.status in ('reserved','issued','redeemed') and not v_active then raise exception 'Active assignment required'; end if;
 if new.status='available' and v_active then raise exception 'Release assignment first'; end if;
 if new.status in ('reserved','issued','redeemed') and ((new.valid_from is not null and new.valid_from>(now() at time zone 'Asia/Taipei')::date) or (new.valid_until is not null and new.valid_until<(now() at time zone 'Asia/Taipei')::date)) then raise exception 'Voucher outside validity'; end if;
 if new.status='redeemed' then new.redeemed_at:=clock_timestamp();
 elsif new.redeemed_at is distinct from old.redeemed_at then raise exception 'Invalid redemption timestamp';
 end if;
 return new;
end $$;
create trigger enterprise_service_transition_guard_v2 before update on public.enterprise_service_vouchers for each row execute function public.enterprise_service_transition_guard_v2();
revoke all on function public.enterprise_service_transition_guard_v2() from public,anon,authenticated,service_role;
-- No issuance or cancellation endpoint is granted. Refund and actor authorization remain mandatory.
