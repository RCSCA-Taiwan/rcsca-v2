-- Additive fulfillment modes; legacy code rewards retain their existing behavior.
alter table public.reward_catalog
 add column fulfillment_type text not null default 'code' check(fulfillment_type in ('code','service','delivery')),
 add column provider_user_id uuid references public.profiles(id),
 add column shipping_policy text not null default 'free' check(shipping_policy in ('free','recipient_pays','included_points')),
 add column shipping_note text check(length(shipping_note)<=500),
 add column booking_hold_hours integer not null default 24 check(booking_hold_hours between 1 and 168);
alter table public.reward_redemptions add column fulfillment_type text not null default 'code' check(fulfillment_type in ('code','service','delivery')),add column reservation_until timestamptz;
create index reward_catalog_provider_idx on public.reward_catalog(provider_user_id);
create table private.reward_slots (
 id uuid primary key default gen_random_uuid(),reward_id uuid not null references public.reward_catalog(id),
 starts_at timestamptz not null,ends_at timestamptz not null,capacity integer not null check(capacity between 1 and 100),
 is_active boolean not null default true,check(ends_at>starts_at),unique(reward_id,starts_at,ends_at)
);
create index reward_slots_reward_idx on private.reward_slots(reward_id,starts_at);
create table private.reward_fulfillment (
 redemption_id uuid primary key references public.reward_redemptions(id),
 fulfillment_type text not null check(fulfillment_type in ('service','delivery')),
 provider_user_id uuid not null references public.profiles(id),
 slot_id uuid references private.reward_slots(id),hold_until timestamptz,
 state text not null check(state in ('pending','time_proposed','confirmed','awaiting_dispatch','shipped','service_delivered','completed','rejected','cancelled')),
 contact_name text not null check(length(contact_name) between 1 and 100),phone text not null check(length(phone) between 6 and 30),
 destination_type text check(destination_type in ('home','store')),postal_code text,address text,
 shipping_policy text not null,shipping_note text,carrier text,tracking_number text,
 contact_consent_at timestamptz not null default now(),provider_note text,issue_note text,issue_resolution text,
 updated_at timestamptz not null default now(),
 check((fulfillment_type='service' and slot_id is not null and hold_until is not null) or (fulfillment_type='delivery' and address is not null))
);
create index reward_fulfillment_slot_idx on private.reward_fulfillment(slot_id,state,hold_until);
create index reward_fulfillment_provider_idx on private.reward_fulfillment(provider_user_id,state);
create index reward_redemptions_user_status_idx on public.reward_redemptions(user_id,status);
alter table private.reward_slots enable row level security;
alter table private.reward_fulfillment enable row level security;
revoke all on private.reward_slots,private.reward_fulfillment from public,anon,authenticated;

create or replace function private.member_points_wallet(p_user uuid,p_at timestamptz default now())
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_since date; v_today date:=(p_at at time zone 'Asia/Taipei')::date; v_start date; v_end date;
  v_years integer; v_effective timestamptz; v_cutoff timestamptz; v_balance bigint; v_reserved bigint; v_status text;
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
  select coalesce(sum(r.point_cost),0) into v_reserved from private.reward_fulfillment f join public.reward_redemptions r on r.id=f.redemption_id
    where r.user_id=p_user and r.status='submitted' and f.fulfillment_type='service' and f.state in ('pending','time_proposed') and f.hold_until>p_at
      and r.created_at<=p_at and (r.points_expires_at is null or r.points_expires_at>p_at);
  return jsonb_build_object('balance',greatest(0,v_balance-v_reserved),'ledger_balance',v_balance,'reserved_points',v_reserved,'status',v_status,'member_since',v_since,'cycle_start',v_start,
    'expires_at',case when v_end is not null then v_end::timestamp at time zone 'Asia/Taipei' end,
    'expires_on',v_end-1,'days_left',case when v_end is not null then v_end-v_today end);
end;$$;

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
  if v_reward.fulfillment_type<>'code' then raise exception 'fulfillment_details_required';end if;
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



CREATE OR REPLACE FUNCTION private.settle_reward_redemption(p_redemption_id uuid, p_decision public.review_status, p_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare v_redemption public.reward_redemptions%rowtype; v_reward public.reward_catalog%rowtype; v_actor uuid:=auth.uid(); v_balance integer; v_code text; v_wallet jsonb; v_request_expiry timestamptz; v_f private.reward_fulfillment%rowtype; v_held integer:=0;
begin

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
  select * into v_f from private.reward_fulfillment where redemption_id=p_redemption_id for update;
  if v_reward.fulfillment_type<>'code' and v_f.redemption_id is null then raise exception 'fulfillment_details_required';end if;
  if p_decision='completed' and v_f.redemption_id is not null and v_f.state<>'completed' then raise exception 'fulfillment_not_completed';end if;
  if p_decision='approved' then
    if v_f.state='time_proposed' and auth.uid()<>v_redemption.user_id then raise exception 'alternative_time_requires_member_confirmation';end if;
    if v_f.fulfillment_type='service' then
      if v_f.hold_until<=now() or v_f.state not in ('pending','time_proposed') then raise exception 'booking_hold_expired';end if;
      perform 1 from private.reward_slots where id=v_f.slot_id and starts_at>now();
      if not found then raise exception 'booking_time_passed';end if;
      v_held:=v_redemption.point_cost;
    end if;
    if v_reward.status<>'approved' then raise exception 'reward_not_available'; end if;
    if v_reward.starts_at is not null and v_reward.starts_at>now() then raise exception 'reward_not_started'; end if;
    if v_reward.ends_at is not null and v_reward.ends_at<=now() then raise exception 'reward_ended'; end if;
    v_wallet:=private.member_points_wallet(v_redemption.user_id);
    v_request_expiry:=coalesce(v_redemption.points_expires_at,(private.member_points_wallet(v_redemption.user_id,v_redemption.created_at)->>'expires_at')::timestamptz);
    if v_request_expiry is not null and v_request_expiry<=now() then raise exception 'redemption_points_expired';end if;
    v_balance:=(v_wallet->>'balance')::integer+v_held;
    if v_balance<v_redemption.point_cost then raise exception 'insufficient_points'; end if;
    if v_reward.stock_remaining is not null and v_reward.stock_remaining<=0 then raise exception 'out_of_stock'; end if;
    insert into public.point_transactions(user_id,tx_type,points,source_type,source_id,description,created_by)
    values(v_redemption.user_id,'spend',-v_redemption.point_cost,'reward_redemption',v_redemption.id,'共享所兌換｜'||v_reward.title,v_actor);
    if v_reward.stock_remaining is not null then
      update public.reward_catalog set stock_remaining=stock_remaining-1,updated_at=now() where id=v_reward.id;
    end if;
    v_code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
    update private.reward_fulfillment set state=case when fulfillment_type='service' then 'confirmed' else 'awaiting_dispatch' end,updated_at=now() where redemption_id=p_redemption_id;
    update public.reward_redemptions set status='approved',redemption_code=coalesce(redemption_code,v_code),updated_at=now() where id=v_redemption.id;
  elsif p_decision='rejected' then
    update private.reward_fulfillment set state='rejected',updated_at=now() where redemption_id=p_redemption_id;
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

revoke all on function private.settle_reward_redemption(uuid,public.review_status,text) from public,anon,authenticated;
create or replace function public.admin_review_reward_redemption(p_redemption_id uuid,p_decision public.review_status,p_note text default null)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_admin(null) then raise exception 'admin_required';end if;
 if exists(select 1 from private.reward_fulfillment where redemption_id=p_redemption_id) and not private.is_admin('admin') then raise exception 'admin_required';end if;
 perform private.settle_reward_redemption(p_redemption_id,p_decision,p_note);
end;$$;

create function private.reward_slot_available(p_slot uuid,p_exclude uuid default null)
returns integer language sql stable security definer set search_path='' as $$
 select greatest(0,s.capacity-(select count(*)::integer from private.reward_fulfillment f join public.reward_redemptions r on r.id=f.redemption_id
  where f.slot_id=s.id and f.redemption_id is distinct from p_exclude and
   (r.status in ('approved','completed') or (r.status='submitted' and f.state in ('pending','time_proposed') and f.hold_until>now() and (r.points_expires_at is null or r.points_expires_at>now())))))
 from private.reward_slots s where s.id=p_slot;
$$;
revoke all on function private.reward_slot_available(uuid,uuid) from public,anon,authenticated;

create function public.reward_available_slots(p_reward uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'starts_at',s.starts_at,'ends_at',s.ends_at,'remaining',private.reward_slot_available(s.id)) order by s.starts_at),'[]'::jsonb)
 from private.reward_slots s join public.reward_catalog c on c.id=s.reward_id where s.reward_id=p_reward and s.is_active and s.starts_at>now() and c.status='approved' and c.fulfillment_type='service';
$$;
revoke all on function public.reward_available_slots(uuid) from public;
grant execute on function public.reward_available_slots(uuid) to anon,authenticated;

create function public.admin_reward_fulfillment_config(p_reward uuid,p_mode text,p_provider_email text,p_shipping_policy text,p_shipping_note text,p_hold_hours integer)
returns void language plpgsql security definer set search_path='' as $$
declare v_provider uuid;v_count integer;v_old public.reward_catalog%rowtype;
begin
 if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 if p_mode is null or p_mode not in ('code','service','delivery') or p_shipping_policy is null or p_shipping_policy not in ('free','recipient_pays','included_points') or p_hold_hours is null or p_hold_hours not between 1 and 168 or length(coalesce(p_shipping_note,''))>500 then raise exception 'invalid_fulfillment_settings';end if;
 if p_mode<>'code' then
  select count(*),(array_agg(id))[1] into v_count,v_provider from public.profiles where lower(trim(email))=lower(trim(p_provider_email)) and is_active;
  if v_count<>1 then raise exception 'provider_account_not_unique';end if;
 end if;
 if p_mode='delivery' and coalesce(length(trim(p_shipping_note)),0)=0 then raise exception 'shipping_terms_required';end if;
 select * into v_old from public.reward_catalog where id=p_reward for update;
 if not found then raise exception 'reward_not_found';end if;
 if exists(select 1 from public.reward_redemptions where reward_id=p_reward and status in ('submitted','approved')) and
  (v_old.fulfillment_type<>p_mode or v_old.provider_user_id is distinct from v_provider or v_old.shipping_policy<>p_shipping_policy or v_old.shipping_note is distinct from nullif(trim(p_shipping_note),'')) then raise exception 'open_orders_lock_fulfillment';end if;
 update public.reward_catalog set fulfillment_type=p_mode,provider_user_id=v_provider,shipping_policy=p_shipping_policy,shipping_note=nullif(trim(p_shipping_note),''),booking_hold_hours=p_hold_hours,updated_at=now() where id=p_reward;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(auth.uid(),'admin','reward_fulfillment_configured','reward_catalog',p_reward::text,p_mode);
end;$$;

create function public.admin_reward_slot_add(p_reward uuid,p_starts timestamptz,p_ends timestamptz,p_capacity integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 perform 1 from public.reward_catalog where id=p_reward and fulfillment_type='service' for update;
 if not found then raise exception 'service_reward_required';end if;
 if p_starts is null or p_ends is null or p_starts<=now() or p_ends<=p_starts or p_capacity is null or p_capacity not between 1 and 100 then raise exception 'invalid_slot';end if;
 if exists(select 1 from private.reward_slots where reward_id=p_reward and is_active and tstzrange(starts_at,ends_at,'[)')&&tstzrange(p_starts,p_ends,'[)')) then raise exception 'overlapping_reward_slot';end if;
 insert into private.reward_slots(reward_id,starts_at,ends_at,capacity) values(p_reward,p_starts,p_ends,p_capacity) returning id into v_id;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(auth.uid(),'admin','reward_slot_created','reward_catalog',p_reward::text,v_id::text);
 return v_id;
end;$$;

create function public.reward_submit_fulfillment(p_reward uuid,p_slot uuid,p_details jsonb,p_consent boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_c public.reward_catalog%rowtype;v_s private.reward_slots%rowtype;v_wallet jsonb;v_id uuid;v_level integer;v_footprints integer;v_hold timestamptz;v_k text;v_v text;v_stock_held integer;
begin
 if v_actor is null then raise exception 'authentication_required';end if;
 if p_consent is distinct from true then raise exception 'contact_consent_required';end if;
 if p_details is null or jsonb_typeof(p_details)<>'object' then raise exception 'invalid_delivery_details';end if;
 for v_k,v_v in select key,value from jsonb_each_text(p_details) loop
  if v_k not in ('contact_name','phone','destination_type','postal_code','address') or jsonb_typeof(p_details->v_k)<>'string' or length(v_v)>500 then raise exception 'invalid_delivery_details';end if;
 end loop;
 if coalesce(length(trim(p_details->>'contact_name')),0) not between 1 and 100 or coalesce(length(trim(p_details->>'phone')),0) not between 6 and 30 then raise exception 'contact_details_required';end if;
 perform 1 from public.profiles where id=v_actor and is_active for no key update;
 if not found then raise exception 'member_profile_not_found';end if;
 perform 1 from public.memberships where user_id=v_actor and status='active' for share;
 if not found then raise exception 'active_membership_required';end if;
 select * into v_c from public.reward_catalog where id=p_reward and status='approved' for update;
 if not found or v_c.fulfillment_type='code' or v_c.provider_user_id is null then raise exception 'reward_not_available';end if;
 if v_c.provider_user_id=v_actor then raise exception 'cannot_redeem_own_reward';end if;
 if (v_c.starts_at is not null and v_c.starts_at>now()) or (v_c.ends_at is not null and v_c.ends_at<=now()) then raise exception 'reward_ended';end if;
 v_wallet:=private.member_points_wallet(v_actor);
 select level into v_level from public.member_levels where user_id=v_actor;
 select count(*) into v_footprints from public.sharing_footprints where user_id=v_actor;
 if (v_wallet->>'balance')::bigint<v_c.point_cost or coalesce(v_level,1)<coalesce(v_c.min_level,1) or v_footprints<v_c.min_footprints then raise exception 'eligibility_not_met';end if;
 if exists(select 1 from public.reward_redemptions r left join private.reward_fulfillment f on f.redemption_id=r.id where r.reward_id=p_reward and r.user_id=v_actor and
  (r.status='approved' or (r.status='submitted' and coalesce(r.points_expires_at,'infinity'::timestamptz)>now() and coalesce(f.hold_until,'infinity'::timestamptz)>now()))) then raise exception 'existing_redemption_pending';end if;
 select count(*) into v_stock_held from private.reward_fulfillment f join public.reward_redemptions r on r.id=f.redemption_id where r.reward_id=p_reward and r.status='submitted' and f.fulfillment_type='service' and f.hold_until>now() and (r.points_expires_at is null or r.points_expires_at>now());
 if v_c.stock_remaining is not null and v_c.stock_remaining<=v_stock_held then raise exception 'reward_out_of_stock';end if;
 if v_c.fulfillment_type='service' then
  select * into v_s from private.reward_slots where id=p_slot and reward_id=p_reward and is_active and starts_at>now() for update;
  if not found then raise exception 'slot_not_available';end if;
  if private.reward_slot_available(v_s.id)<=0 then raise exception 'slot_full';end if;
  v_hold:=least(now()+make_interval(hours=>v_c.booking_hold_hours),v_s.starts_at,coalesce((v_wallet->>'expires_at')::timestamptz,'infinity'::timestamptz));
 else
  if p_slot is not null or coalesce(p_details->>'destination_type','') not in ('home','store') or coalesce(length(trim(p_details->>'address')),0)<3 then raise exception 'delivery_address_required';end if;
  if p_details->>'destination_type'='home' and coalesce(p_details->>'postal_code','')!~'^[0-9]{3}([0-9]{2,3})?$' then raise exception 'postal_code_required';end if;
 end if;
 insert into public.reward_redemptions(reward_id,user_id,point_cost,status,points_expires_at,fulfillment_type,reservation_until) values(p_reward,v_actor,v_c.point_cost,'submitted',(v_wallet->>'expires_at')::timestamptz,v_c.fulfillment_type,v_hold) returning id into v_id;
 insert into private.reward_fulfillment(redemption_id,fulfillment_type,provider_user_id,slot_id,hold_until,state,contact_name,phone,destination_type,postal_code,address,shipping_policy,shipping_note)
 values(v_id,v_c.fulfillment_type,v_c.provider_user_id,case when v_c.fulfillment_type='service' then p_slot end,v_hold,'pending',trim(p_details->>'contact_name'),trim(p_details->>'phone'),case when v_c.fulfillment_type='delivery' then p_details->>'destination_type' end,case when v_c.fulfillment_type='delivery' then p_details->>'postal_code' end,case when v_c.fulfillment_type='delivery' then trim(p_details->>'address') end,v_c.shipping_policy,v_c.shipping_note);
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(v_actor,'member','reward_fulfillment_submitted','reward_redemption',v_id::text,v_c.fulfillment_type);
 insert into public.user_notifications(recipient_user_id,kind,title,body,related_type,related_id) values(v_c.provider_user_id,'reward_fulfillment','收到新的預約或配送申請','請至共享所履約工作台處理。','reward_redemption',v_id);
 return v_id;
end;$$;

create function public.reward_fulfillment_list(p_manage boolean default false)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'authentication_required';end if;
 return coalesce((select jsonb_agg(to_jsonb(f)||jsonb_build_object('id',r.id,'reward_id',r.reward_id,'title',c.title,'point_cost',r.point_cost,'redemption_status',r.status,'created_at',r.created_at,'starts_at',s.starts_at,'ends_at',s.ends_at,
 'effective_state',case when r.status='submitted' and ((f.hold_until is not null and f.hold_until<=now()) or (r.points_expires_at is not null and r.points_expires_at<=now())) then 'expired' else f.state end) order by r.created_at desc)
 from private.reward_fulfillment f join public.reward_redemptions r on r.id=f.redemption_id join public.reward_catalog c on c.id=r.reward_id left join private.reward_slots s on s.id=f.slot_id
 where (not p_manage and r.user_id=auth.uid()) or (p_manage and (f.provider_user_id=auth.uid() or private.is_admin('admin')))),'[]'::jsonb);
end;$$;

create function public.reward_fulfillment_action(p_redemption uuid,p_action text,p_note text default '',p_slot uuid default null,p_carrier text default '',p_tracking text default '')
returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_r public.reward_redemptions%rowtype;v_f private.reward_fulfillment%rowtype;v_s private.reward_slots%rowtype;v_manager boolean;v_owner boolean;
begin
 if v_actor is null then raise exception 'authentication_required';end if;
 select * into v_r from public.reward_redemptions where id=p_redemption for update;
 select * into v_f from private.reward_fulfillment where redemption_id=p_redemption for update;
 if v_f.redemption_id is null then raise exception 'fulfillment_not_found';end if;
 v_owner:=v_r.user_id=v_actor;v_manager:=v_f.provider_user_id=v_actor or private.is_admin('admin');
 if not v_owner and not v_manager then raise exception 'fulfillment_access_denied';end if;
 perform 1 from public.profiles where id=v_r.user_id for no key update;
 perform 1 from public.reward_catalog where id=v_r.reward_id for update;
 if length(coalesce(p_note,''))>1000 or length(coalesce(p_carrier,''))>100 or length(coalesce(p_tracking,''))>100 then raise exception 'invalid_fulfillment_note';end if;
 if p_action='cancel' and v_owner and v_r.status='submitted' then
  update public.reward_redemptions set status='cancelled',updated_at=now() where id=p_redemption;
  update private.reward_fulfillment set state='cancelled',updated_at=now() where redemption_id=p_redemption;
 elsif p_action='reject' and v_manager and v_r.status='submitted' and coalesce(length(trim(p_note)),0)>0 then
  perform private.settle_reward_redemption(p_redemption,'rejected',p_note);
 elsif p_action='confirm' and v_manager and v_r.status='submitted' and v_f.state='pending' then
  perform private.settle_reward_redemption(p_redemption,'approved',p_note);
 elsif p_action='propose_time' and v_manager and v_r.status='submitted' and v_f.fulfillment_type='service' and v_f.state in ('pending','time_proposed') then
  if v_f.hold_until<=now() then raise exception 'booking_hold_expired';end if;
  select * into v_s from private.reward_slots where id=p_slot and reward_id=v_r.reward_id and is_active and starts_at>now() for update;
  if not found or private.reward_slot_available(p_slot,p_redemption)<=0 then raise exception 'slot_not_available';end if;
  update public.reward_redemptions set reservation_until=least(v_f.hold_until,v_s.starts_at) where id=p_redemption;
  update private.reward_fulfillment set slot_id=p_slot,state='time_proposed',hold_until=least(hold_until,v_s.starts_at),provider_note=nullif(trim(p_note),''),updated_at=now() where redemption_id=p_redemption;
 elsif p_action='accept_time' and v_owner and v_r.status='submitted' and v_f.state='time_proposed' then
  perform private.settle_reward_redemption(p_redemption,'approved','會員接受替代時段');
 elsif p_action='ship' and v_manager and v_r.status='approved' and v_f.state='awaiting_dispatch' and coalesce(length(trim(p_carrier)),0)>0 and coalesce(length(trim(p_tracking)),0)>0 then
  update private.reward_fulfillment set state='shipped',carrier=trim(p_carrier),tracking_number=trim(p_tracking),provider_note=nullif(trim(p_note),''),updated_at=now() where redemption_id=p_redemption;
 elsif p_action='service_delivered' and v_manager and v_r.status='approved' and v_f.state='confirmed' then
  perform 1 from private.reward_slots where id=v_f.slot_id and starts_at<=now();
  if not found then raise exception 'service_not_started';end if;
  update private.reward_fulfillment set state='service_delivered',updated_at=now() where redemption_id=p_redemption;
 elsif p_action='received' and v_owner and v_r.status='approved' and v_f.state in ('shipped','service_delivered') then
  update private.reward_fulfillment set state='completed',updated_at=now() where redemption_id=p_redemption;
  perform private.settle_reward_redemption(p_redemption,'completed','會員確認已收到商品或服務');
 elsif p_action='report_issue' and v_owner and v_r.status in ('approved','completed') and coalesce(length(trim(p_note)),0)>0 then
  update private.reward_fulfillment set issue_note=trim(p_note),issue_resolution=null,updated_at=now() where redemption_id=p_redemption;
 elsif p_action='resolve_issue' and private.is_admin('admin') and v_f.issue_note is not null and coalesce(length(trim(p_note)),0)>0 then
  update private.reward_fulfillment set issue_resolution=trim(p_note),updated_at=now() where redemption_id=p_redemption;
 else raise exception 'invalid_fulfillment_transition';end if;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(v_actor,case when v_owner then 'member' else 'reward_provider' end,'reward_fulfillment_'||p_action,'reward_redemption',p_redemption::text,nullif(trim(p_note),''));
 insert into public.user_notifications(recipient_user_id,kind,title,body,related_type,related_id)
 values(case when v_owner then v_f.provider_user_id else v_r.user_id end,'reward_fulfillment','預約或配送進度已更新','請至我的兌換或履約工作台查看最新狀態。','reward_redemption',p_redemption)
 on conflict(recipient_user_id,kind,related_type,related_id) where related_id is not null do update set title=excluded.title,body=excluded.body,read_at=null,created_at=now();
end;$$;

revoke all on function public.admin_reward_fulfillment_config(uuid,text,text,text,text,integer),public.admin_reward_slot_add(uuid,timestamptz,timestamptz,integer),public.reward_submit_fulfillment(uuid,uuid,jsonb,boolean),public.reward_fulfillment_list(boolean),public.reward_fulfillment_action(uuid,text,text,uuid,text,text) from public,anon;
grant execute on function public.admin_reward_fulfillment_config(uuid,text,text,text,text,integer),public.admin_reward_slot_add(uuid,timestamptz,timestamptz,integer),public.reward_submit_fulfillment(uuid,uuid,jsonb,boolean),public.reward_fulfillment_list(boolean),public.reward_fulfillment_action(uuid,text,text,uuid,text,text) to authenticated;

create function public.admin_upsert_reward_with_fulfillment(p_catalog jsonb,p_settings jsonb)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 v_id:=public.admin_upsert_reward_catalog((p_catalog->>'id')::uuid,p_catalog->>'category',p_catalog->>'title',p_catalog->>'description',
 (p_catalog->>'point_cost')::integer,(p_catalog->>'stock_total')::integer,(p_catalog->>'min_level')::integer,(p_catalog->>'min_footprints')::integer,(p_catalog->>'status')::public.review_status,(p_catalog->>'starts_at')::timestamptz,(p_catalog->>'ends_at')::timestamptz);
 perform public.admin_reward_fulfillment_config(v_id,p_settings->>'mode',p_settings->>'provider_email',p_settings->>'shipping_policy',p_settings->>'shipping_note',(p_settings->>'hold_hours')::integer);
 return v_id;
end;$$;
create function public.admin_reward_fulfillment_catalog()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 return coalesce((select jsonb_agg(to_jsonb(c)||jsonb_build_object('provider_email',p.email,'slots',coalesce((select jsonb_agg(to_jsonb(s)||jsonb_build_object('remaining',private.reward_slot_available(s.id)) order by s.starts_at) from private.reward_slots s where s.reward_id=c.id),'[]'::jsonb)) order by c.updated_at desc)
 from public.reward_catalog c left join public.profiles p on p.id=c.provider_user_id),'[]'::jsonb);
end;$$;
revoke all on function public.admin_upsert_reward_with_fulfillment(jsonb,jsonb),public.admin_reward_fulfillment_catalog() from public,anon;
grant execute on function public.admin_upsert_reward_with_fulfillment(jsonb,jsonb),public.admin_reward_fulfillment_catalog() to authenticated;
