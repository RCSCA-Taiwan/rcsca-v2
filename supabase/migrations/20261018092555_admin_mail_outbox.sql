-- New submissions only: no historical backfill, network call or automatic mail.
create table private.admin_mail_control (
 singleton boolean primary key default true check(singleton),
 manual_enabled boolean not null default false,
 changed_by uuid references auth.users(id) on delete set null,
 changed_at timestamptz not null default now()
);
insert into private.admin_mail_control(singleton) values(true);
create table private.admin_mail_outbox (
 id uuid primary key default gen_random_uuid(),
 source_kind text not null check(source_kind in ('enterprise_applications','enterprise_shares','network_match_responses','support_cases','record_change_requests','reward_redemptions','activity_participations','membership_applications')),
 source_id uuid not null,
 submission integer not null check(submission>0),
 state text not null default 'pending' check(state in ('pending','sending','accepted','failed','unknown','cancelled')),
 attempts integer not null default 0 check(attempts between 0 and 5),
 lease_id uuid,lease_until timestamptz,
 retry_after timestamptz not null default now(),
 failure_code text check(failure_code in ('authentication_failed','connection_failed','connection_timeout','tls_failed','rejected','unconfirmed')),
 recipient_email text,subject_prefix text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),accepted_at timestamptz,
 unique(source_kind,source_id,submission)
);
create index admin_mail_pending on private.admin_mail_outbox(created_at,id) where state='pending';
create index admin_mail_recent on private.admin_mail_outbox(created_at desc,id desc);
create index admin_mail_lease_expiry on private.admin_mail_outbox(lease_until) where state='sending';
create table private.admin_mail_attempts (
 id uuid primary key default gen_random_uuid(),
 outbox_id uuid not null references private.admin_mail_outbox(id),
 attempt integer not null,
 lease_id uuid not null unique,
 actor_id uuid references auth.users(id) on delete set null,
 state text not null check(state in ('sending','accepted','failed','unknown')),
 failure_code text check(failure_code in ('authentication_failed','connection_failed','connection_timeout','tls_failed','rejected','unconfirmed')),
 started_at timestamptz not null default now(),finished_at timestamptz,
 unique(outbox_id,attempt)
);
create table private.admin_mail_actions (
 id uuid primary key default gen_random_uuid(),
 outbox_id uuid references private.admin_mail_outbox(id),
 actor_id uuid references auth.users(id) on delete set null,
 action text not null check(action in ('enable_manual','disable_manual','retry_failed','retry_unknown')),
 created_at timestamptz not null default now()
);
create index admin_mail_attempt_actor on private.admin_mail_attempts(actor_id);
create index admin_mail_action_actor on private.admin_mail_actions(actor_id);
create index admin_mail_action_entry on private.admin_mail_actions(outbox_id);
create index admin_mail_control_actor on private.admin_mail_control(changed_by);
alter table private.admin_mail_control enable row level security;
alter table private.admin_mail_outbox enable row level security;
alter table private.admin_mail_attempts enable row level security;
alter table private.admin_mail_actions enable row level security;
revoke all on private.admin_mail_control,private.admin_mail_outbox,private.admin_mail_attempts,private.admin_mail_actions from public,anon,authenticated;

create function private.capture_admin_mail_submission()
returns trigger language plpgsql security definer set search_path='' as $$
declare row_id uuid; target_status text:=tg_argv[0]; revision integer;
begin
 row_id:=case when tg_op='DELETE' then old.id else new.id end;
 if tg_op='UPDATE' and new.status is not distinct from old.status then return new;end if;
 -- A reviewed, withdrawn or deleted source must not leave stale pending mail.
 update private.admin_mail_outbox set state='cancelled',updated_at=now()
 where source_kind=tg_table_name and source_id=row_id and state in ('pending','failed');
 if tg_op='DELETE' then return old;end if;
 if new.status::text=target_status then
  select coalesce(max(submission),0)+1 into revision from private.admin_mail_outbox where source_kind=tg_table_name and source_id=row_id;
  insert into private.admin_mail_outbox(source_kind,source_id,submission) values(tg_table_name,row_id,revision);
 end if;
 return new;
end;$$;
revoke all on function private.capture_admin_mail_submission() from public,anon,authenticated;
do $$declare table_name text;begin
 foreach table_name in array array['enterprise_applications','enterprise_shares','network_match_responses','support_cases','record_change_requests','reward_redemptions'] loop
  execute format('create trigger capture_admin_mail_submission after insert or update of status or delete on public.%I for each row execute function private.capture_admin_mail_submission(''submitted'')',table_name);
 end loop;
end;$$;
create trigger capture_admin_mail_submission after insert or update of status or delete on public.activity_participations
for each row execute function private.capture_admin_mail_submission('pending');
create trigger capture_admin_mail_submission after insert or update of status or delete on private.membership_applications
for each row execute function private.capture_admin_mail_submission('pending');

create function private.expire_admin_mail_leases()
returns void language plpgsql security definer set search_path='' as $$
begin
 with expired as (
  update private.admin_mail_outbox set state='unknown',failure_code='unconfirmed',updated_at=now()
  where state='sending' and lease_until<now() returning lease_id
 ) update private.admin_mail_attempts a set state='unknown',failure_code='unconfirmed',finished_at=now()
 where a.lease_id in (select lease_id from expired) and a.state='sending';
end;$$;
revoke all on function private.expire_admin_mail_leases() from public,anon,authenticated;

create function public.admin_mail_queue()
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 perform private.expire_admin_mail_leases();
 select jsonb_build_object('manual_enabled',(select manual_enabled from private.admin_mail_control where singleton),
 'automatic_enabled',false,'items',coalesce((select jsonb_agg(item order by created_at desc,id desc) from (
  select id,source_kind,state,attempts,failure_code,created_at,updated_at,accepted_at,retry_after
  from private.admin_mail_outbox order by created_at desc,id desc limit 50
 ) item),'[]'::jsonb),
 'counts',coalesce((select jsonb_object_agg(state,total) from (select state,count(*) total from private.admin_mail_outbox group by state) counts),'{}'::jsonb)) into result;
 return result;
end;$$;

create function public.admin_mail_set_manual(p_enabled boolean,p_receipt_confirmed boolean default false)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 if p_enabled is null or (p_enabled and p_receipt_confirmed is distinct from true) then raise exception 'receipt_confirmation_required';end if;
 update private.admin_mail_control set manual_enabled=p_enabled,changed_by=auth.uid(),changed_at=now() where singleton;
 insert into private.admin_mail_actions(actor_id,action) values(auth.uid(),case when p_enabled then 'enable_manual' else 'disable_manual' end);
end;$$;

create function public.admin_mail_claim()
returns jsonb language plpgsql security definer set search_path='' as $$
declare entry private.admin_mail_outbox; routing private.site_mail_routing;begin
 if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 if not (select manual_enabled from private.admin_mail_control where singleton) then raise exception 'manual_delivery_disabled';end if;
 select * into routing from private.site_mail_routing where singleton;
 if routing.recipient_email is null then raise exception 'recipient_not_configured';end if;
 perform private.expire_admin_mail_leases();
 select * into entry from private.admin_mail_outbox where state='pending' and attempts<5 and retry_after<=now()
 order by created_at,id for update skip locked limit 1;
 if not found then return null;end if;
 update private.admin_mail_outbox set state='sending',attempts=attempts+1,lease_id=gen_random_uuid(),lease_until=now()+interval '2 minutes',
 recipient_email=routing.recipient_email,subject_prefix=routing.subject_prefix,failure_code=null,updated_at=now()
 where id=entry.id returning * into entry;
 insert into private.admin_mail_attempts(outbox_id,attempt,lease_id,actor_id,state) values(entry.id,entry.attempts,entry.lease_id,auth.uid(),'sending');
 return jsonb_build_object('id',entry.id,'lease_id',entry.lease_id,'source_kind',entry.source_kind,'recipient_email',entry.recipient_email,'subject_prefix',entry.subject_prefix);
end;$$;

create function public.admin_mail_finish(p_id uuid,p_lease uuid,p_outcome text,p_failure text default null)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 if p_outcome not in ('accepted','failed','unknown') or p_outcome is null or
 (p_outcome='accepted' and p_failure is not null) or
 (p_outcome<>'accepted' and (p_failure is null or p_failure not in ('authentication_failed','connection_failed','connection_timeout','tls_failed','rejected','unconfirmed'))) then raise exception 'invalid_mail_result';end if;
 update private.admin_mail_outbox set state=p_outcome,failure_code=p_failure,updated_at=now(),retry_after=now()+interval '1 minute',
 accepted_at=case when p_outcome='accepted' then now() else null end
 where id=p_id and lease_id=p_lease and state in ('sending','unknown');
 if not found then raise exception 'stale_mail_attempt';end if;
 update private.admin_mail_attempts set state=p_outcome,failure_code=p_failure,finished_at=now() where lease_id=p_lease;
end;$$;

create function public.admin_mail_retry(p_id uuid,p_duplicate_checked boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare entry private.admin_mail_outbox; source_schema text; expected text; current_status text;begin
 if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 perform private.expire_admin_mail_leases();
 select * into entry from private.admin_mail_outbox where id=p_id for update;
 if not found or entry.state not in ('failed','unknown') or entry.attempts>=5 or entry.retry_after>now() then raise exception 'mail_retry_unavailable';end if;
 if entry.state='unknown' and p_duplicate_checked is distinct from true then raise exception 'duplicate_confirmation_required';end if;
 source_schema:=case when entry.source_kind='membership_applications' then 'private' else 'public' end;
 expected:=case when entry.source_kind in ('membership_applications','activity_participations') then 'pending' else 'submitted' end;
 execute format('select status::text from %I.%I where id=$1',source_schema,entry.source_kind) into current_status using entry.source_id;
 if current_status is distinct from expected then
  update private.admin_mail_outbox set state='cancelled',updated_at=now() where id=p_id;return;
 end if;
 -- An earlier submission can never be revived after a later resubmission.
 if exists(select 1 from private.admin_mail_outbox where source_kind=entry.source_kind and source_id=entry.source_id and submission>entry.submission) then raise exception 'stale_mail_submission';end if;
 insert into private.admin_mail_actions(outbox_id,actor_id,action) values(p_id,auth.uid(),case when entry.state='unknown' then 'retry_unknown' else 'retry_failed' end);
 update private.admin_mail_outbox set state='pending',lease_id=null,lease_until=null,updated_at=now() where id=p_id;
end;$$;
revoke all on function public.admin_mail_queue(),public.admin_mail_set_manual(boolean,boolean),public.admin_mail_claim(),public.admin_mail_finish(uuid,uuid,text,text),public.admin_mail_retry(uuid,boolean) from public,anon;
grant execute on function public.admin_mail_queue(),public.admin_mail_set_manual(boolean,boolean),public.admin_mail_claim(),public.admin_mail_finish(uuid,uuid,text,text),public.admin_mail_retry(uuid,boolean) to authenticated;
