-- Preserve the ledger. Expiry changes spendable balance, never XP or footprints.
create table private.points_policy (
  singleton boolean primary key default true check(singleton),
  effective_at timestamptz not null default now()
);
alter table private.points_policy enable row level security;
revoke all on private.points_policy from public,anon,authenticated;
insert into private.points_policy(singleton) values(true);

-- p_at is private and exists to make anniversary/leap-day boundaries testable.
create function private.member_points_wallet(p_user uuid,p_at timestamptz default now())
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_since date; v_today date:=(p_at at time zone 'Asia/Taipei')::date; v_start date; v_end date;
  v_years integer; v_effective timestamptz; v_cutoff timestamptz; v_balance bigint; v_status text;
begin
  -- Only human-confirmed admission history can establish an expiry date.
  select min(member_since) into v_since from private.membership_register where user_id=p_user;
  if v_since is not null and v_since<=v_today then
    v_years:=extract(year from v_today)::integer-extract(year from v_since)::integer;
    v_start:=(v_since+make_interval(years=>v_years))::date;
    if v_start>v_today then v_years:=v_years-1;v_start:=(v_since+make_interval(years=>v_years))::date;end if;
    -- Always derive from original admission day so Feb 29 returns in leap years.
    v_end:=(v_since+make_interval(years=>v_years+1))::date;
    select effective_at into v_effective from private.points_policy where singleton;
    -- Initial membership period includes pre-membership points. Existing points
    -- survive rollout until the next anniversary, never expire on deployment.
    if v_years>0 and (v_start::timestamp at time zone 'Asia/Taipei')>v_effective then
      v_cutoff:=v_start::timestamp at time zone 'Asia/Taipei';
    end if;
    v_status:='active_cycle';
  else
    v_status:=case when exists(select 1 from public.memberships where user_id=p_user and membership_type in ('annual','lifetime')) then 'admission_pending' else 'before_membership' end;
  end if;
  select greatest(0,coalesce(sum(points),0)) into v_balance from public.point_transactions
    where user_id=p_user and created_at<=p_at and (v_cutoff is null or created_at>=v_cutoff);
  return jsonb_build_object('balance',v_balance,'status',v_status,'member_since',v_since,'cycle_start',v_start,
    'expires_at',case when v_end is not null then v_end::timestamp at time zone 'Asia/Taipei' end,
    'expires_on',v_end-1,'days_left',case when v_end is not null then v_end-v_today end);
end;$$;
revoke all on function private.member_points_wallet(uuid,timestamptz) from public,anon,authenticated;

create function public.point_wallet_self()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'authentication_required';end if;
  return private.member_points_wallet(auth.uid());
end;$$;
revoke all on function public.point_wallet_self() from public,anon;
grant execute on function public.point_wallet_self() to authenticated;

alter table public.reward_redemptions add column points_expires_at timestamptz;
-- Requests already in review inherit their first known deadline. Approval also
-- rechecks the live deadline when the admission date was confirmed afterwards.
update public.reward_redemptions r set points_expires_at=(private.member_points_wallet(r.user_id)->>'expires_at')::timestamptz
  where status in ('submitted','under_review');

-- Membership is required at request and approval; point earning remains independent.
create or replace function public.reward_submit_redemption(p_reward_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_reward public.reward_catalog%rowtype; v_id uuid; v_points integer; v_level integer; v_footprints integer; v_wallet jsonb;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  -- Serialize submissions by the same account, including duplicate requests.
  perform 1 from public.profiles where id=v_actor for no key update;
  if not found then raise exception 'member_profile_not_found'; end if;
  perform 1 from public.memberships where user_id=v_actor and status='active' for share;
  if not found then raise exception 'active_membership_required'; end if;
  select * into v_reward from public.reward_catalog where id=p_reward_id and status='approved' for share;
  if not found then raise exception 'reward_not_available'; end if;
  if v_reward.starts_at is not null and v_reward.starts_at>now() then raise exception 'reward_not_started'; end if;
  if v_reward.ends_at is not null and v_reward.ends_at<=now() then raise exception 'reward_ended'; end if;
  if v_reward.stock_remaining is not null and v_reward.stock_remaining<=0 then raise exception 'reward_out_of_stock'; end if;
  v_wallet:=private.member_points_wallet(v_actor);
  v_points:=(v_wallet->>'balance')::integer;
  select coalesce(level,1) into v_level from public.member_levels where user_id=v_actor;
  if v_level is null then v_level:=1; end if;
  select count(*)::int into v_footprints from public.sharing_footprints where user_id=v_actor;
  if v_points<v_reward.point_cost or v_level<coalesce(v_reward.min_level,1) or v_footprints<v_reward.min_footprints then raise exception 'eligibility_not_met'; end if;
  if exists(select 1 from public.reward_redemptions where reward_id=p_reward_id and user_id=v_actor and status in ('submitted','under_review','approved') and (status='approved' or coalesce(points_expires_at,(private.member_points_wallet(user_id,created_at)->>'expires_at')::timestamptz,'infinity'::timestamptz)>now())) then raise exception 'existing_redemption_pending'; end if;
  insert into public.reward_redemptions(reward_id,user_id,point_cost,status,points_expires_at) values(p_reward_id,v_actor,v_reward.point_cost,'submitted',(v_wallet->>'expires_at')::timestamptz) returning id into v_id;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(v_actor,'member','submit_reward_redemption','reward_redemption',v_id::text,'會員提出共享所兌換申請');
  return v_id;
end;$$;
revoke all on function public.reward_submit_redemption(uuid) from public,anon;
grant execute on function public.reward_submit_redemption(uuid) to authenticated;


CREATE OR REPLACE FUNCTION public.admin_review_reward_redemption(p_redemption_id uuid, p_decision review_status, p_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare v_redemption public.reward_redemptions%rowtype; v_reward public.reward_catalog%rowtype; v_actor uuid:=auth.uid(); v_balance integer; v_code text; v_wallet jsonb; v_request_expiry timestamptz;
begin
  if not private.is_admin(null) then raise exception 'admin_required'; end if;
  if p_decision is null or p_decision not in ('approved','rejected','completed') then raise exception 'invalid_decision'; end if;
  select * into v_redemption from public.reward_redemptions where id=p_redemption_id for update;
  if not found then raise exception 'redemption_not_found'; end if;
  -- Serialize a member's balance across different rewards before inventory locking.
  if p_decision='approved' then
    perform 1 from public.profiles where id=v_redemption.user_id for no key update;
    if not found then raise exception 'member_profile_not_found'; end if;
    -- Keep membership changes from racing approval in this transaction.
    perform 1 from public.memberships where user_id=v_redemption.user_id and status='active' for share;
    if not found then raise exception 'active_membership_required'; end if;
  end if;
  select * into v_reward from public.reward_catalog where id=v_redemption.reward_id for update;
  if not found then raise exception 'reward_not_found'; end if;
  if p_decision in ('approved','rejected') and v_redemption.status<>'submitted' then raise exception 'invalid_status_transition'; end if;
  if p_decision='completed' and v_redemption.status<>'approved' then raise exception 'invalid_status_transition'; end if;
  if p_decision='approved' then
    if v_reward.status<>'approved' then raise exception 'reward_not_available'; end if;
    if v_reward.starts_at is not null and v_reward.starts_at>now() then raise exception 'reward_not_started'; end if;
    if v_reward.ends_at is not null and v_reward.ends_at<=now() then raise exception 'reward_ended'; end if;
    v_wallet:=private.member_points_wallet(v_redemption.user_id);
    v_request_expiry:=coalesce(v_redemption.points_expires_at,(private.member_points_wallet(v_redemption.user_id,v_redemption.created_at)->>'expires_at')::timestamptz);
    if v_request_expiry is not null and v_request_expiry<=now() then raise exception 'redemption_points_expired';end if;
    v_balance:=(v_wallet->>'balance')::integer;
    if v_balance<v_redemption.point_cost then raise exception 'insufficient_points'; end if;
    if v_reward.stock_remaining is not null and v_reward.stock_remaining<=0 then raise exception 'out_of_stock'; end if;
    insert into public.point_transactions(user_id,tx_type,points,source_type,source_id,description,created_by)
    values(v_redemption.user_id,'spend',-v_redemption.point_cost,'reward_redemption',v_redemption.id,'共享所兌換｜'||v_reward.title,v_actor);
    if v_reward.stock_remaining is not null then
      update public.reward_catalog set stock_remaining=stock_remaining-1,updated_at=now() where id=v_reward.id;
    end if;
    v_code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
    update public.reward_redemptions set status='approved',redemption_code=coalesce(redemption_code,v_code),updated_at=now() where id=v_redemption.id;
  elsif p_decision='rejected' then
    update public.reward_redemptions set status='rejected',updated_at=now() where id=v_redemption.id;
  else
    update public.reward_redemptions set status='completed',updated_at=now() where id=v_redemption.id;
  end if;
  insert into public.user_notifications(recipient_user_id,kind,title,body,related_type,related_id)
  values(v_redemption.user_id,'reward_redemption','共享所兌換狀態已更新',
    case p_decision when 'approved' then '兌換已核准，共享點已扣除並產生兌換碼。'
      when 'completed' then '這筆共享回饋已完成核銷。' else '這筆兌換申請未通過，未扣除共享點。' end,
    'reward_redemption',v_redemption.id)
  on conflict (recipient_user_id,kind,related_type,related_id) where related_id is not null
  do update set title=excluded.title,body=excluded.body,read_at=null,created_at=now();
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'admin','reward_redemption_'||p_decision::text,'reward_redemption',v_redemption.id::text,p_note);
end;$function$;
