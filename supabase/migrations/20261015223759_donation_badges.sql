-- Contribution recognition is independent of membership, XP and spendable points.
create table private.donation_records (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),amount integer not null check(amount>0),received_on date not null,
 receipt_reference text not null unique check(length(trim(receipt_reference)) between 1 and 120),note text not null check(length(trim(note)) between 1 and 1000),
 status text not null default 'verified' check(status in ('verified','void')),verified_by uuid not null references public.profiles(id),void_note text,created_at timestamptz not null default now()
);
create table private.donation_badge_rules (
 id uuid primary key default gen_random_uuid(),label text not null check(length(trim(label)) between 1 and 60),threshold integer not null check(threshold>0),
 period text not null check(period in ('lifetime','annual')),effective_from date not null,include_history boolean not null default false,
 status text not null default 'draft' check(status in ('draft','active','retired')),policy_note text not null check(length(trim(policy_note)) between 1 and 1000),updated_by uuid not null references public.profiles(id),updated_at timestamptz not null default now()
);
create index donation_records_user_idx on private.donation_records(user_id,received_on);
create index donation_records_verifier_idx on private.donation_records(verified_by);
create index donation_badge_rules_updater_idx on private.donation_badge_rules(updated_by);
alter table private.donation_records enable row level security;
alter table private.donation_badge_rules enable row level security;
revoke all on private.donation_records,private.donation_badge_rules from public,anon,authenticated;

create function public.donation_contribution_self()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_today date:=(now() at time zone 'Asia/Taipei')::date;
begin
 if auth.uid() is null then raise exception 'authentication_required';end if;
 return jsonb_build_object('verified_total',coalesce((select sum(amount) from private.donation_records where user_id=auth.uid() and status='verified'),0),
 'rules_active',exists(select 1 from private.donation_badge_rules where status='active' and effective_from<=v_today),
 'badges',coalesce((select jsonb_agg(to_jsonb(b)) from (select distinct on (r.period) r.label,r.period,
 case when r.period='annual' then extract(year from v_today)::integer end as year
 from private.donation_badge_rules r where r.status='active' and r.effective_from<=v_today and r.threshold<=coalesce((select sum(d.amount) from private.donation_records d where d.user_id=auth.uid() and d.status='verified'
 and (r.include_history or d.received_on>=r.effective_from) and (r.period='lifetime' or extract(year from d.received_on)=extract(year from v_today))),0)
 order by r.period,r.threshold desc,r.label) b),'[]'::jsonb),
 'records',coalesce((select jsonb_agg(jsonb_build_object('id',id,'amount',amount,'received_on',received_on,'receipt_reference',receipt_reference,'status',status,'void_note',void_note) order by received_on desc) from private.donation_records where user_id=auth.uid()),'[]'::jsonb));
end;$$;
create function public.admin_donation_overview()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 return jsonb_build_object('rules',coalesce((select jsonb_agg(to_jsonb(r) order by updated_at desc) from private.donation_badge_rules r),'[]'::jsonb),
 'records',coalesce((select jsonb_agg(to_jsonb(d)||jsonb_build_object('display_name',p.display_name) order by d.created_at desc) from private.donation_records d join public.profiles p on p.id=d.user_id),'[]'::jsonb));
end;$$;
create function public.admin_donation_record(p_email text,p_amount integer,p_received date,p_reference text,p_note text,p_verified boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid;v_count integer;v_id uuid;
begin
 if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 if p_verified is distinct from true then raise exception 'payment_verification_required';end if;
 if p_amount is null or p_amount<=0 or p_received is null or p_received>(now() at time zone 'Asia/Taipei')::date or coalesce(length(trim(p_reference)),0) not between 1 and 120 or coalesce(length(trim(p_note)),0) not between 1 and 1000 then raise exception 'invalid_donation_record';end if;
 select count(*),(array_agg(id))[1] into v_count,v_user from public.profiles where lower(trim(email))=lower(trim(p_email));
 if v_count<>1 then raise exception 'donor_account_not_unique';end if;
 if v_user=auth.uid() then raise exception 'cannot_verify_own_donation';end if;
 if exists(select 1 from private.donation_records where receipt_reference=trim(p_reference)) then raise exception 'duplicate_donation_reference';end if;
 insert into private.donation_records(user_id,amount,received_on,receipt_reference,note,verified_by) values(v_user,p_amount,p_received,trim(p_reference),trim(p_note),auth.uid()) returning id into v_id;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(auth.uid(),'admin','donation_verified','donation_record',v_id::text,'核實入帳；未發放共享點或 XP');
 return v_id;
end;$$;
create function public.admin_donation_void(p_id uuid,p_note text)
returns void language plpgsql security definer set search_path='' as $$
declare v_d private.donation_records%rowtype;
begin
 if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 if coalesce(length(trim(p_note)),0) not between 1 and 1000 then raise exception 'review_note_required';end if;
 select * into v_d from private.donation_records where id=p_id for update;
 if not found or v_d.status<>'verified' then raise exception 'donation_not_voidable';end if;
 if v_d.user_id=auth.uid() then raise exception 'cannot_verify_own_donation';end if;
 update private.donation_records set status='void',void_note=trim(p_note) where id=p_id;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(auth.uid(),'admin','donation_voided','donation_record',p_id::text,trim(p_note));
end;$$;
create function public.admin_donation_badge_rule(p_id uuid,p_label text,p_threshold integer,p_period text,p_effective date,p_history boolean,p_status text,p_note text,p_confirmed boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 if p_status is null or p_status not in ('draft','active','retired') or p_period is null or p_period not in ('lifetime','annual') or p_effective is null or p_threshold is null or p_threshold<=0 or coalesce(length(trim(p_label)),0) not between 1 and 60 or coalesce(length(trim(p_note)),0) not between 1 and 1000 then raise exception 'invalid_badge_rule';end if;
 if p_status='active' and p_confirmed is distinct from true then raise exception 'policy_approval_required';end if;
 if p_id is null then
 insert into private.donation_badge_rules(label,threshold,period,effective_from,include_history,status,policy_note,updated_by) values(trim(p_label),p_threshold,p_period,p_effective,coalesce(p_history,false),p_status,trim(p_note),auth.uid()) returning id into v_id;
 else
 update private.donation_badge_rules set label=trim(p_label),threshold=p_threshold,period=p_period,effective_from=p_effective,include_history=coalesce(p_history,false),status=p_status,policy_note=trim(p_note),updated_by=auth.uid(),updated_at=now() where id=p_id returning id into v_id;
 if not found then raise exception 'badge_rule_not_found';end if;
 end if;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(auth.uid(),'admin','donation_badge_policy_'||p_status,'donation_badge_rule',v_id::text,trim(p_note));
 return v_id;
end;$$;
revoke all on function public.donation_contribution_self(),public.admin_donation_overview(),public.admin_donation_record(text,integer,date,text,text,boolean),public.admin_donation_void(uuid,text),public.admin_donation_badge_rule(uuid,text,integer,text,date,boolean,text,text,boolean) from public,anon;
grant execute on function public.donation_contribution_self(),public.admin_donation_overview(),public.admin_donation_record(text,integer,date,text,text,boolean),public.admin_donation_void(uuid,text),public.admin_donation_badge_rule(uuid,text,integer,text,date,boolean,text,text,boolean) to authenticated;
