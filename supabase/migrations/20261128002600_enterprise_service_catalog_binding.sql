create table public.enterprise_service_catalog_v2 (
 receipt_id uuid primary key references public.enterprise_share_receipts(id),
 reward_id uuid not null references public.reward_catalog(id),
 linked_by uuid not null references auth.users(id),
 linked_at timestamptz not null default now()
);
alter table public.enterprise_service_catalog_v2 enable row level security;
revoke all on public.enterprise_service_catalog_v2 from public,anon,authenticated,service_role;
create function public.enterprise_service_assignment_guard_v2()
returns trigger language plpgsql security invoker set search_path='' as $$
declare v_status text; v_reward uuid; v_catalog uuid;
begin
 if tg_op='UPDATE' then
 if new.voucher_id<>old.voucher_id or new.redemption_id<>old.redemption_id or new.assigned_at<>old.assigned_at or old.released_at is not null or new.released_at is null then raise exception 'Assignment history immutable'; end if;
 return new;
 end if;
 select v.status::text,l.reward_id into v_status,v_catalog
 from public.enterprise_service_vouchers v join public.enterprise_service_catalog_v2 l on l.receipt_id=v.receipt_id
 where v.id=new.voucher_id for update of v;
 if not found or v_status<>'available' then raise exception 'Voucher unavailable'; end if;
 select reward_id into strict v_reward from public.reward_redemptions where id=new.redemption_id;
 if v_reward is distinct from v_catalog then raise exception 'Voucher reward mismatch'; end if;
 if new.released_at is not null then raise exception 'Invalid initial assignment'; end if;
 return new;
end $$;
create trigger enterprise_service_assignment_guard_v2 before insert or update on public.enterprise_service_assignments_v2 for each row execute function public.enterprise_service_assignment_guard_v2();
revoke all on function public.enterprise_service_assignment_guard_v2() from public,anon,authenticated,service_role;
-- Internal only. Catalog mapping approval, points and actor authorization remain required.
