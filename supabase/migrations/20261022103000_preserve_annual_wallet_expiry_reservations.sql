-- Calendar-year point cycles must preserve per-transaction expiry and service holds.
-- Refund credits retain their original deadline; active service proposals reserve
-- spendable balance until the hold expires. The annual Jan 1-Dec 31 boundary
-- remains the outer wallet window.
create or replace function private.member_points_wallet(p_user uuid,p_at timestamptz default now())
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_since date;
  v_today date := (p_at at time zone 'Asia/Taipei')::date;
  v_start date := make_date(extract(year from (p_at at time zone 'Asia/Taipei'))::integer,1,1);
  v_end date := make_date(extract(year from (p_at at time zone 'Asia/Taipei'))::integer+1,1,1);
  v_start_at timestamptz;
  v_end_at timestamptz;
  v_balance bigint;
  v_reserved bigint;
  v_status text;
begin
  select min(member_since) into v_since
  from private.membership_register
  where user_id=p_user;

  v_start_at := v_start::timestamp at time zone 'Asia/Taipei';
  v_end_at := v_end::timestamp at time zone 'Asia/Taipei';

  if exists(
    select 1 from public.memberships
    where user_id=p_user and status='active' and membership_type in ('annual','lifetime')
  ) then
    v_status := case when v_since is null then 'admission_pending' else 'active_cycle' end;
  else
    v_status := 'before_membership';
  end if;

  select greatest(0,coalesce(sum(points),0)) into v_balance
  from public.point_transactions
  where user_id=p_user
    and created_at>=v_start_at
    and created_at<v_end_at
    and created_at<=p_at
    and (expires_at is null or expires_at>p_at);

  select coalesce(sum(r.point_cost),0) into v_reserved
  from private.reward_fulfillment f
  join public.reward_redemptions r on r.id=f.redemption_id
  where r.user_id=p_user
    and r.status='submitted'
    and f.fulfillment_type='service'
    and f.state in ('pending','time_proposed')
    and f.hold_until>p_at
    and r.created_at>=v_start_at
    and r.created_at<v_end_at
    and r.created_at<=p_at
    and (r.points_expires_at is null or r.points_expires_at>p_at);

  return jsonb_build_object(
    'balance',greatest(0,v_balance-v_reserved),
    'ledger_balance',v_balance,
    'reserved_points',v_reserved,
    'status',v_status,
    'member_since',v_since,
    'cycle_start',v_start,
    'expires_at',v_end_at,
    'expires_on',v_end-1,
    'days_left',v_end-v_today
  );
end;
$$;

revoke all on function private.member_points_wallet(uuid,timestamptz) from public,anon,authenticated;
