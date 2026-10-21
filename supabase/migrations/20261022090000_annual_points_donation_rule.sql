-- RCSCA points are a calendar-year benefit: Jan 1 through Dec 31 (Asia/Taipei).
-- Donation recognition grants one spendable point per complete NT$1,000 only
-- after a verified donation record exists. Donation badge/XP policy remains
-- separately configurable and is intentionally not invented here.

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
    and created_at<=p_at;

  return jsonb_build_object(
    'balance',v_balance,
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

-- A donation can earn and later be voided exactly once. Separate source types
-- allow an auditable reversal without deleting the original earning entry.
create unique index if not exists point_transactions_donation_verified_once
  on public.point_transactions(source_id)
  where source_type='donation_verified' and source_id is not null;

create unique index if not exists point_transactions_donation_void_once
  on public.point_transactions(source_id)
  where source_type='donation_void' and source_id is not null;

create or replace function private.sync_donation_points()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_points integer;
  v_actor uuid;
begin
  if tg_op='INSERT' then
    if new.status<>'verified' then return new; end if;
    v_points := floor(new.amount/1000.0)::integer;
    if v_points>0 then
      insert into public.point_transactions(user_id,tx_type,points,source_type,source_id,description,created_by)
      values(new.user_id,'earn',v_points,'donation_verified',new.id,
        '捐款核實｜每新台幣 1,000 元 1 共享點',new.verified_by)
      on conflict do nothing;
    end if;
    return new;
  end if;

  if tg_op='UPDATE' and old.status='verified' and new.status='void' then
    v_points := floor(old.amount/1000.0)::integer;
    v_actor := auth.uid();
    if v_points>0 then
      insert into public.point_transactions(user_id,tx_type,points,source_type,source_id,description,created_by)
      values(old.user_id,'adjust',-v_points,'donation_void',old.id,
        '捐款作廢｜沖回原核實共享點',coalesce(v_actor,old.verified_by))
      on conflict do nothing;
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.sync_donation_points() from public,anon,authenticated;

drop trigger if exists donation_points_sync on private.donation_records;
create trigger donation_points_sync
after insert or update of status on private.donation_records
for each row execute function private.sync_donation_points();

-- Correct the audit wording of the legacy single-record verifier now that
-- verified donations award points through the trigger above.
create or replace function private.admin_donation_record(p_email text,p_amount integer,p_received date,p_reference text,p_note text,p_verified boolean)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare v_user uuid;v_count integer;v_id uuid;
begin
 if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 if p_verified is distinct from true then raise exception 'payment_verification_required';end if;
 if p_amount is null or p_amount<=0 or p_received is null or p_received>(now() at time zone 'Asia/Taipei')::date or coalesce(length(trim(p_reference)),0) not between 1 and 120 or coalesce(length(trim(p_note)),0) not between 1 and 1000 then raise exception 'invalid_donation_record';end if;
 select count(*),(array_agg(id))[1] into v_count,v_user from public.profiles where lower(trim(email))=lower(trim(p_email));
 if v_count<>1 then raise exception 'donor_account_not_unique';end if;
 if v_user=auth.uid() then raise exception 'cannot_verify_own_donation';end if;
 if exists(select 1 from private.donation_records where receipt_reference=trim(p_reference)) then raise exception 'duplicate_donation_reference';end if;
 insert into private.donation_records(user_id,amount,received_on,receipt_reference,note,verified_by)
 values(v_user,p_amount,p_received,trim(p_reference),trim(p_note),auth.uid()) returning id into v_id;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
 values(auth.uid(),'admin','donation_verified','donation_record',v_id::text,
   '核實入帳；每完整新台幣 1,000 元發放 1 共享點；徽章／XP 依另行核定規則');
 return v_id;
end;
$$;
revoke all on function private.admin_donation_record(text,integer,date,text,text,boolean) from public,anon,authenticated;

-- Replace batch commit only to correct its audit statement; inserts continue to
-- flow through donation_records and therefore the same idempotent point trigger.
create or replace function public.admin_donation_import_commit(p_id uuid,p_activity text,p_rows jsonb,p_digest text,p_verified boolean)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare v_preview jsonb;v_row jsonb;v_batch private.donation_import_batches%rowtype;
begin
 if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 if p_verified is distinct from true or p_id is null then raise exception 'payment_verification_required';end if;
 perform pg_advisory_xact_lock(hashtextextended('donation_ingest',0));
 select * into v_batch from private.donation_import_batches where id=p_id;
 if found then
   if v_batch.activity<>trim(p_activity) or v_batch.rows<>p_rows or v_batch.digest<>p_digest then raise exception 'import_request_conflict';end if;
   return jsonb_build_object('id',p_id,'count',v_batch.record_count,'total_received',v_batch.total_received,'retry',true);
 end if;
 v_preview:=public.admin_donation_import_preview(p_activity,p_rows);
 if v_preview->>'digest' is distinct from p_digest then raise exception 'preview_changed_review_again';end if;
 if v_preview->>'ready'<>v_preview->>'count' then raise exception 'unresolved_import_rows';end if;
 insert into private.donation_import_batches values(p_id,trim(p_activity),p_digest,p_rows,auth.uid(),now(),(v_preview->>'count')::integer,(v_preview->>'total_received')::bigint);
 for v_row in select value from jsonb_array_elements(v_preview->'rows') loop
   insert into private.donation_records(user_id,amount,received_on,receipt_reference,note,verified_by,activity_name,pledged_amount,import_batch)
   values((v_row->>'user_id')::uuid,(v_row->'input'->>'amount')::integer,(v_row->'input'->>'received_on')::date,upper(trim(v_row->'input'->>'reference')),trim(v_row->'input'->>'note'),auth.uid(),trim(p_activity),(v_row->'input'->>'pledged')::integer,p_id);
   if nullif(trim(v_row->'input'->>'name'),'') is not null then
     insert into private.donation_name_links(activity,label,user_id,confirmed_by)
     values(trim(p_activity),trim(v_row->'input'->>'name'),(v_row->>'user_id')::uuid,auth.uid()) on conflict do nothing;
   end if;
 end loop;
 update private.donation_pledge_drafts set status='imported',updated_at=now() where id=p_id and created_by=auth.uid();
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
 values(auth.uid(),'admin','donation_batch_imported','donation_import_batch',p_id::text,
   '整批核實實收入帳；每筆每完整新台幣 1,000 元發放 1 共享點；徽章／XP 依另行核定規則');
 return jsonb_build_object('id',p_id,'count',(v_preview->>'count')::integer,'total_received',(v_preview->>'total_received')::bigint,'retry',false);
end;
$$;
revoke all on function public.admin_donation_import_commit(uuid,text,jsonb,text,boolean) from public,anon;
grant execute on function public.admin_donation_import_commit(uuid,text,jsonb,text,boolean) to authenticated;
