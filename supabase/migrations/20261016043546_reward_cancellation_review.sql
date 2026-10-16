-- Approved, unfulfilled redemptions require a reviewed cancellation.
-- Refund credits retain the original points deadline, including expired credits.
alter table public.point_transactions add column expires_at timestamptz;
create unique index reward_refund_once_idx on public.point_transactions(source_id) where source_type='reward_refund';
create table private.reward_cancellations (
 redemption_id uuid primary key references public.reward_redemptions(id),
 user_id uuid not null references public.profiles(id),
 status text not null check(status in ('submitted','approved','rejected','withdrawn')),
 reason text not null check(length(reason) between 1 and 1000),
 review_note text check(length(review_note)<=1000),
 reviewed_by uuid references public.profiles(id), reviewed_at timestamptz,
 points_expires_at timestamptz, refunded_points integer not null default 0 check(refunded_points>=0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index reward_cancellations_queue_idx on private.reward_cancellations(status,created_at);
alter table private.reward_cancellations enable row level security;
revoke all on private.reward_cancellations from public,anon,authenticated;

-- Protect all existing fulfillment/settlement paths, including old clients.
create function private.guard_reward_cancellation() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from private.reward_cancellations q where q.redemption_id=new.id
   and q.status='submitted') then
  if new.status is distinct from old.status then
   raise exception 'cancellation_review_pending';
  end if;
 end if;
 return new;
end;$$;
-- Separate fulfillment trigger avoids referring to a nonexistent record field.
create function private.guard_fulfillment_cancellation() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.state is distinct from old.state and exists(select 1 from private.reward_cancellations where redemption_id=new.redemption_id and status='submitted') then
  raise exception 'cancellation_review_pending';
 end if;
 return new;
end;$$;
create trigger reward_cancellation_guard before update on public.reward_redemptions for each row execute function private.guard_reward_cancellation();
create trigger fulfillment_cancellation_guard before update on private.reward_fulfillment for each row execute function private.guard_fulfillment_cancellation();
revoke all on function private.guard_reward_cancellation(),private.guard_fulfillment_cancellation() from public,anon,authenticated;

create function private.reward_cancellation_action(p_redemption uuid,p_action text,p_note text default '')
returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_r public.reward_redemptions%rowtype;v_f private.reward_fulfillment%rowtype;
 v_q private.reward_cancellations%rowtype;v_expiry timestamptz;v_spent integer;v_count integer;v_spent_at timestamptz;v_owner boolean;v_admin boolean;
begin
 if v_actor is null then raise exception 'authentication_required';end if;
 select * into v_r from public.reward_redemptions where id=p_redemption for update;
 if not found then raise exception 'redemption_not_found';end if;
 v_owner:=v_r.user_id=v_actor;v_admin:=private.is_admin('admin');
 if not v_owner and not v_admin then raise exception 'cancellation_access_denied';end if;
 if p_action is null or p_action not in ('submit','withdraw','approve','reject') then raise exception 'invalid_cancellation_action';end if;
 if length(coalesce(p_note,''))>1000 or (p_action<>'withdraw' and coalesce(length(trim(p_note)),0)=0) then raise exception 'cancellation_note_required';end if;
 perform 1 from public.profiles where id=v_r.user_id for no key update;
 perform 1 from public.reward_catalog where id=v_r.reward_id for update;
 select * into v_f from private.reward_fulfillment where redemption_id=p_redemption for update;
 select * into v_q from private.reward_cancellations where redemption_id=p_redemption for update;
 if p_action='withdraw' then
  if not v_owner or v_q.status is distinct from 'submitted' then raise exception 'invalid_cancellation_transition';end if;
  update private.reward_cancellations set status='withdrawn',updated_at=now() where redemption_id=p_redemption;
 elsif p_action='reject' then
  if not v_admin or v_owner then raise exception 'independent_admin_required';end if;
  if v_q.status is distinct from 'submitted' then raise exception 'invalid_cancellation_transition';end if;
  update private.reward_cancellations set status='rejected',review_note=trim(p_note),reviewed_by=v_actor,reviewed_at=now(),updated_at=now() where redemption_id=p_redemption;
 else
  if p_action='submit' and not v_owner then raise exception 'cancellation_owner_required';end if;
  if p_action='approve' and (not v_admin or v_owner) then raise exception 'independent_admin_required';end if;
  if v_r.status<>'approved' then raise exception 'cancellation_requires_approved';end if;
  if v_f.redemption_id is not null and (v_f.state not in ('confirmed','awaiting_dispatch') or
    (v_f.fulfillment_type='service' and not exists(select 1 from private.reward_slots where id=v_f.slot_id and starts_at>now()))) then
   raise exception 'cancellation_requires_unfulfilled';
  end if;
  if p_action='submit' then
   if v_q.status='submitted' then raise exception 'cancellation_already_pending';end if;
   if v_q.status='approved' then raise exception 'invalid_cancellation_transition';end if;
   select count(*),-sum(points),min(created_at) into v_count,v_spent,v_spent_at from public.point_transactions
    where source_type='reward_redemption' and source_id=p_redemption and user_id=v_r.user_id and tx_type='spend';
   if v_r.point_cost>0 and (v_count<>1 or v_spent<>v_r.point_cost) then raise exception 'cancellation_spend_mismatch';end if;
   v_expiry:=least(v_r.points_expires_at,(private.member_points_wallet(v_r.user_id,coalesce(v_spent_at,v_r.updated_at))->>'expires_at')::timestamptz);
   insert into private.reward_cancellations(redemption_id,user_id,status,reason,points_expires_at)
    values(p_redemption,v_r.user_id,'submitted',trim(p_note),v_expiry)
    on conflict(redemption_id) do update set status='submitted',reason=excluded.reason,points_expires_at=excluded.points_expires_at,
     review_note=null,reviewed_by=null,reviewed_at=null,created_at=now(),updated_at=now();
  else
   if v_q.status is distinct from 'submitted' then raise exception 'invalid_cancellation_transition';end if;
   -- Verify the debit again and atomically credit, invalidate code, release stock/slot.
   select count(*),-sum(points) into v_count,v_spent from public.point_transactions
    where source_type='reward_redemption' and source_id=p_redemption and user_id=v_r.user_id and tx_type='spend';
   if v_r.point_cost>0 and (v_count<>1 or v_spent<>v_r.point_cost) then raise exception 'cancellation_spend_mismatch';end if;
   if v_r.point_cost>0 then
    insert into public.point_transactions(user_id,tx_type,points,source_type,source_id,description,created_by,expires_at)
     values(v_r.user_id,'adjust',v_r.point_cost,'reward_refund',p_redemption,'核准取消兌換，退回原效期積分',v_actor,v_q.points_expires_at);
   end if;
   update private.reward_cancellations set status='approved',review_note=trim(p_note),reviewed_by=v_actor,reviewed_at=now(),refunded_points=v_r.point_cost,updated_at=now() where redemption_id=p_redemption;
   update public.reward_redemptions set status='cancelled',redemption_code=null,updated_at=now() where id=p_redemption;
   update private.reward_fulfillment set state='cancelled',updated_at=now() where redemption_id=p_redemption;
   update public.reward_catalog set stock_remaining=case when stock_remaining is null then null else stock_remaining+1 end,updated_at=now() where id=v_r.reward_id;
  end if;
 end if;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
 values(v_actor,case when v_owner then 'member' else 'admin' end,'reward_cancellation_'||p_action,'reward_redemption',p_redemption::text,nullif(trim(p_note),''));
 insert into public.user_notifications(recipient_user_id,kind,title,body,related_type,related_id)
 values(v_r.user_id,'reward_cancellation','兌換取消申請進度已更新',case p_action when 'approve' then '取消已核准，原兌換碼失效。退回積分保留原效期，已到期部分不可使用。' when 'reject' then '取消申請未通過，原訂單繼續履約。' when 'withdraw' then '已撤回取消申請，原訂單繼續履約。' else '取消申請已送審，審核期間暫停核銷、出貨與服務完成操作。' end,'reward_redemption',p_redemption)
 on conflict(recipient_user_id,kind,related_type,related_id) where related_id is not null do update set title=excluded.title,body=excluded.body,read_at=null,created_at=now();
 if v_f.provider_user_id is not null then
  insert into public.user_notifications(recipient_user_id,kind,title,body,related_type,related_id)
  values(v_f.provider_user_id,'reward_cancellation','訂單取消審核狀態已更新','請至履約工作台查看。取消送審期間暫停出貨與服務完成操作。','reward_redemption',p_redemption)
  on conflict(recipient_user_id,kind,related_type,related_id) where related_id is not null do update set title=excluded.title,body=excluded.body,read_at=null,created_at=now();
 end if;
end;$$;

create function private.reward_cancellation_list(p_manage boolean default false)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'authentication_required';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('redemption_id',r.id,'title',c.title,'point_cost',r.point_cost,'redemption_status',r.status,
 'can_review',private.is_admin('admin') and r.user_id<>auth.uid(),'fulfillment_type',r.fulfillment_type,'can_request',r.status='approved' and (f.redemption_id is null or (f.state='awaiting_dispatch') or (f.state='confirmed' and s.starts_at>now())),
 'status',q.status,'reason',q.reason,'review_note',q.review_note,'points_expires_at',q.points_expires_at,'refunded_points',q.refunded_points,
 'refunded_available',case when q.points_expires_at<=now() then 0 else q.refunded_points end,'created_at',q.created_at) order by coalesce(q.created_at,r.created_at) desc)
 from public.reward_redemptions r join public.reward_catalog c on c.id=r.reward_id
 left join private.reward_fulfillment f on f.redemption_id=r.id left join private.reward_slots s on s.id=f.slot_id left join private.reward_cancellations q on q.redemption_id=r.id
 where (not p_manage and r.user_id=auth.uid() and (r.status='approved' or q.redemption_id is not null)) or
  (p_manage and (private.is_admin('admin') or f.provider_user_id=auth.uid()) and q.redemption_id is not null)),'[]'::jsonb);
end;$$;
revoke all on function private.reward_cancellation_action(uuid,text,text),private.reward_cancellation_list(boolean) from public,anon;
grant execute on function private.reward_cancellation_action(uuid,text,text),private.reward_cancellation_list(boolean) to authenticated;
create function public.reward_cancellation_action(p_redemption uuid,p_action text,p_note text default '')
returns void language sql security invoker set search_path='' as $$ select private.reward_cancellation_action(p_redemption,p_action,p_note); $$;
create function public.reward_cancellation_list(p_manage boolean default false)
returns jsonb language sql stable security invoker set search_path='' as $$ select private.reward_cancellation_list(p_manage); $$;
revoke all on function public.reward_cancellation_action(uuid,text,text),public.reward_cancellation_list(boolean) from public,anon;
grant execute on function public.reward_cancellation_action(uuid,text,text),public.reward_cancellation_list(boolean) to authenticated;

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
    where user_id=p_user and created_at<=p_at and (v_cutoff is null or created_at>=v_cutoff)
      and (expires_at is null or expires_at>p_at);
  select coalesce(sum(r.point_cost),0) into v_reserved from private.reward_fulfillment f join public.reward_redemptions r on r.id=f.redemption_id
    where r.user_id=p_user and r.status='submitted' and f.fulfillment_type='service' and f.state in ('pending','time_proposed') and f.hold_until>p_at
      and r.created_at<=p_at and (r.points_expires_at is null or r.points_expires_at>p_at);
  return jsonb_build_object('balance',greatest(0,v_balance-v_reserved),'ledger_balance',v_balance,'reserved_points',v_reserved,'status',v_status,'member_since',v_since,'cycle_start',v_start,
    'expires_at',case when v_end is not null then v_end::timestamp at time zone 'Asia/Taipei' end,
    'expires_on',v_end-1,'days_left',case when v_end is not null then v_end-v_today end);
end;$$;

create or replace function public.reward_fulfillment_list(p_manage boolean default false)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'authentication_required';end if;
 return coalesce((select jsonb_agg(to_jsonb(f)||jsonb_build_object('id',r.id,'reward_id',r.reward_id,'title',c.title,'point_cost',r.point_cost,'redemption_status',r.status,'created_at',r.created_at,'starts_at',s.starts_at,'ends_at',s.ends_at,
 'cancellation_pending',exists(select 1 from private.reward_cancellations q where q.redemption_id=r.id and q.status='submitted'),
 'effective_state',case when r.status='submitted' and ((f.hold_until is not null and f.hold_until<=now()) or (r.points_expires_at is not null and r.points_expires_at<=now())) then 'expired' else f.state end) order by r.created_at desc)
 from private.reward_fulfillment f join public.reward_redemptions r on r.id=f.redemption_id join public.reward_catalog c on c.id=r.reward_id left join private.reward_slots s on s.id=f.slot_id
 where (not p_manage and r.user_id=auth.uid()) or (p_manage and (f.provider_user_id=auth.uid() or private.is_admin('admin')))),'[]'::jsonb);
end;$$;
