-- Internal inventory intake; no API grants.
create table public.enterprise_reward_stock_v2 (
 receipt_id uuid primary key references public.enterprise_share_receipts(id),
 received_quantity integer not null check(received_quantity>0),
 available_quantity integer not null check(available_quantity>=0 and available_quantity<=received_quantity),
 points_per_unit integer not null check(points_per_unit>0),
 created_at timestamptz not null default now()
);
alter table public.enterprise_reward_stock_v2 enable row level security;
revoke all on public.enterprise_reward_stock_v2 from public,anon,authenticated,service_role;
create function public.enterprise_reward_stock_intake_v2(p_receipt uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare v_r public.enterprise_share_receipts%rowtype; v_p public.enterprise_share_plans%rowtype; v_plan uuid;
begin
 select plan_id into v_plan from public.enterprise_share_receipts where id=p_receipt;
 if not found then raise exception 'Unknown receipt'; end if;
 select * into strict v_p from public.enterprise_share_plans where id=v_plan for update;
 select * into strict v_r from public.enterprise_share_receipts where id=p_receipt for update;
 if v_r.plan_id<>v_plan or v_r.kind<>'physical_stock' or v_r.verified_at is null or v_r.verified_by is null or v_p.resource_type<>'product' or v_p.status not in ('accepted','completed') or v_p.approved_points is null then raise exception 'Receipt not eligible'; end if;
 insert into public.enterprise_reward_stock_v2(receipt_id,received_quantity,available_quantity,points_per_unit)
 values(p_receipt,v_r.quantity,v_r.quantity,v_p.approved_points) on conflict(receipt_id) do nothing;
 return p_receipt;
end $$;
revoke all on function public.enterprise_reward_stock_intake_v2(uuid) from public,anon,authenticated,service_role;
-- Receipt immutability, staff authorization, points ledger and redemption integration pending.
