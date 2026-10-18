-- Default-off automation. Scheduling/credential provisioning is a separate,
-- production-only operation after the HTTP worker has been deployed and tested.
alter table private.admin_mail_control add column automatic_enabled boolean not null default false;
create table private.admin_mail_worker_config (
 singleton boolean primary key default true check(singleton),
 token_hash bytea, vault_secret_id uuid,
 scheduler_ready boolean not null default false,
 scheduler_tick_at timestamptz, worker_seen_at timestamptz
);
insert into private.admin_mail_worker_config(singleton) values(true);
create table private.admin_mail_runs (
 id uuid primary key default gen_random_uuid(),
 state text not null check(state in ('running','completed','unknown','configuration_failed')),
 claimed integer not null default 0 check(claimed between 0 and 3),
 started_at timestamptz not null default now(),
 lease_until timestamptz not null default now()+interval '5 minutes',
 finished_at timestamptz
);
create index admin_mail_runs_recent on private.admin_mail_runs(started_at desc);
create unique index admin_mail_one_running_worker on private.admin_mail_runs((true)) where state='running';
alter table private.admin_mail_outbox add column worker_run_id uuid references private.admin_mail_runs(id);
create index admin_mail_outbox_run on private.admin_mail_outbox(worker_run_id) where worker_run_id is not null;
alter table private.admin_mail_worker_config enable row level security;
alter table private.admin_mail_runs enable row level security;
revoke all on private.admin_mail_worker_config,private.admin_mail_runs from public,anon,authenticated;
alter table private.admin_mail_actions drop constraint admin_mail_actions_action_check;
alter table private.admin_mail_actions add constraint admin_mail_actions_action_check
 check(action in ('enable_manual','disable_manual','retry_failed','retry_unknown','enable_automatic','disable_automatic'));

create function private.admin_mail_set_automatic(p_enabled boolean,p_receipt_confirmed boolean default false)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 if p_enabled is null then raise exception 'invalid_setting';end if;
 if p_enabled and (p_receipt_confirmed is distinct from true or not exists(
  select 1 from private.admin_mail_worker_config where singleton and scheduler_ready and token_hash is not null
  and worker_seen_at is not null and scheduler_tick_at>now()-interval '15 minutes')) then raise exception 'automation_not_ready';end if;
 update private.admin_mail_control set automatic_enabled=p_enabled,changed_by=auth.uid(),changed_at=now() where singleton;
 insert into private.admin_mail_actions(actor_id,action) values(auth.uid(),case when p_enabled then 'enable_automatic' else 'disable_automatic' end);
end;$$;
create function public.admin_mail_set_automatic(p_enabled boolean,p_receipt_confirmed boolean default false)
returns void language sql security invoker set search_path='' as $$select private.admin_mail_set_automatic(p_enabled,p_receipt_confirmed);$$;
revoke all on function private.admin_mail_set_automatic(boolean,boolean),public.admin_mail_set_automatic(boolean,boolean) from public,anon;
grant execute on function private.admin_mail_set_automatic(boolean,boolean),public.admin_mail_set_automatic(boolean,boolean) to authenticated;

-- Capability-limited worker API. No auth impersonation, service-role key,
-- arbitrary recipient, message body, source query or configuration writes.
create function private.admin_mail_worker(p_token text,p_action text,p_run uuid default null,
 p_id uuid default null,p_lease uuid default null,p_outcome text default null,p_failure text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg private.admin_mail_worker_config; run private.admin_mail_runs; entry private.admin_mail_outbox;
 routing private.site_mail_routing; enabled boolean; next_state text; source_schema text; expected text; current_status text;
begin
 select * into cfg from private.admin_mail_worker_config where singleton for update;
 if p_token is null or length(p_token)<>64 or cfg.token_hash is null
 or sha256(convert_to(p_token,'UTF8'))<>cfg.token_hash then raise exception 'worker_required';end if;
 select automatic_enabled into enabled from private.admin_mail_control where singleton;
 if p_action='begin' then
  update private.admin_mail_worker_config set worker_seen_at=now() where singleton;
  perform private.expire_admin_mail_leases();
  update private.admin_mail_runs set state='unknown',finished_at=now() where state='running' and lease_until<now();
  if not enabled then return jsonb_build_object('state','paused');end if;
  if exists(select 1 from private.admin_mail_runs where state='running') then return jsonb_build_object('state','busy');end if;
  insert into private.admin_mail_runs(state) values('running') returning * into run;
  return jsonb_build_object('state','running','id',run.id);
 end if;
 select * into run from private.admin_mail_runs where id=p_run and state='running' and lease_until>now() for update;
 if not found then raise exception 'stale_worker_run';end if;
 if p_action='close' then
  if p_outcome not in ('completed','unknown','configuration_failed') or p_outcome is null then raise exception 'invalid_run_result';end if;
  update private.admin_mail_runs set state=p_outcome,finished_at=now() where id=p_run;
  return jsonb_build_object('state',p_outcome);
 elsif p_action='claim' then
  if not enabled or run.claimed>=3 then return null;end if;
  select * into routing from private.site_mail_routing where singleton;
  if routing.recipient_email is null then raise exception 'recipient_not_configured';end if;
  select * into entry from private.admin_mail_outbox where state='pending' and attempts<5 and retry_after<=now()
   order by created_at,id for update skip locked limit 1;
  if not found then return null;end if;
  source_schema:=case when entry.source_kind='membership_applications' then 'private' else 'public' end;
  expected:=case when entry.source_kind in ('membership_applications','activity_participations') then 'pending' else 'submitted' end;
  execute format('select status::text from %I.%I where id=$1',source_schema,entry.source_kind) into current_status using entry.source_id;
  if current_status is distinct from expected or exists(select 1 from private.admin_mail_outbox
   where source_kind=entry.source_kind and source_id=entry.source_id and submission>entry.submission) then
   update private.admin_mail_outbox set state='cancelled',updated_at=now() where id=entry.id;
   return null;
  end if;
  update private.admin_mail_outbox set state='sending',attempts=attempts+1,lease_id=gen_random_uuid(),lease_until=now()+interval '2 minutes',
   worker_run_id=p_run,recipient_email=routing.recipient_email,subject_prefix=routing.subject_prefix,failure_code=null,updated_at=now()
   where id=entry.id returning * into entry;
  insert into private.admin_mail_attempts(outbox_id,attempt,lease_id,state) values(entry.id,entry.attempts,entry.lease_id,'sending');
  update private.admin_mail_runs set claimed=claimed+1 where id=p_run;
  return jsonb_build_object('id',entry.id,'lease_id',entry.lease_id,'source_kind',entry.source_kind,'recipient_email',entry.recipient_email,'subject_prefix',entry.subject_prefix);
 elsif p_action='finish' then
  if p_outcome is null or p_outcome not in ('accepted','failed','unknown') or
   (p_outcome='accepted' and p_failure is not null) or
   (p_outcome<>'accepted' and (p_failure is null or p_failure not in ('authentication_failed','connection_failed','connection_timeout','tls_failed','rejected','unconfirmed'))) then raise exception 'invalid_mail_result';end if;
  select * into entry from private.admin_mail_outbox where id=p_id and worker_run_id=p_run and lease_id=p_lease
   and state in ('sending','unknown') for update;
  if not found then raise exception 'stale_mail_attempt';end if;
  -- Unknown delivery is never retried. Definitive failures keep a durable
  -- attempt record and bounded backoff; the fifth failure is terminal.
  next_state:=case when p_outcome='failed' and p_failure<>'unconfirmed' and entry.attempts<5 then 'pending' else p_outcome end;
  update private.admin_mail_outbox set state=next_state,failure_code=p_failure,updated_at=now(),
   retry_after=now()+case entry.attempts when 1 then interval '1 minute' when 2 then interval '5 minutes' when 3 then interval '15 minutes' else interval '60 minutes' end,
   accepted_at=case when p_outcome='accepted' then now() else null end where id=p_id;
  update private.admin_mail_attempts set state=p_outcome,failure_code=p_failure,finished_at=now() where lease_id=p_lease;
  return jsonb_build_object('state',next_state);
 end if;
 raise exception 'invalid_worker_action';
end;$$;
create function public.admin_mail_worker(p_token text,p_action text,p_run uuid default null,
 p_id uuid default null,p_lease uuid default null,p_outcome text default null,p_failure text default null)
returns jsonb language sql security invoker set search_path='' as $$
 select private.admin_mail_worker(p_token,p_action,p_run,p_id,p_lease,p_outcome,p_failure);$$;
revoke all on function private.admin_mail_worker(text,text,uuid,uuid,uuid,text,text),public.admin_mail_worker(text,text,uuid,uuid,uuid,text,text) from public;
grant execute on function private.admin_mail_worker(text,text,uuid,uuid,uuid,text,text),public.admin_mail_worker(text,text,uuid,uuid,uuid,text,text) to anon,authenticated;

create or replace function private.admin_mail_queue()
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 perform private.expire_admin_mail_leases();
 select jsonb_build_object('manual_enabled',c.manual_enabled,'automatic_enabled',c.automatic_enabled,
 'automatic_ready',w.scheduler_ready and w.token_hash is not null and w.worker_seen_at is not null and w.scheduler_tick_at>now()-interval '15 minutes',
 'scheduler_tick_at',w.scheduler_tick_at,'worker_seen_at',w.worker_seen_at,
 'last_run',(select jsonb_build_object('state',r.state,'claimed',r.claimed,'started_at',r.started_at,'finished_at',r.finished_at)
  from private.admin_mail_runs r order by r.started_at desc limit 1),
 'items',coalesce((select jsonb_agg(item order by created_at desc,id desc) from (
  select id,source_kind,state,attempts,failure_code,created_at,updated_at,accepted_at,retry_after
  from private.admin_mail_outbox order by created_at desc,id desc limit 50
 ) item),'[]'::jsonb),
 'counts',coalesce((select jsonb_object_agg(state,total) from (select state,count(*) total from private.admin_mail_outbox group by state) counts),'{}'::jsonb))
 into result from private.admin_mail_control c cross join private.admin_mail_worker_config w where c.singleton and w.singleton;
 return result;
end;$$;

-- Install pg_cron/pg_net and provision Vault separately, only after rollout.
-- This body contains no credential, queue content or caller-controlled URL.
create function private.dispatch_admin_mail_tick()
returns void language plpgsql security definer set search_path='' as $$
declare secret text; secret_id uuid; ready boolean;
begin
 update private.admin_mail_worker_config set scheduler_tick_at=now() where singleton
 returning vault_secret_id,scheduler_ready into secret_id,ready;
 if not ready or secret_id is null or not (select automatic_enabled from private.admin_mail_control where singleton) then return;end if;
 execute 'select decrypted_secret from vault.decrypted_secrets where id=$1' into secret using secret_id;
 if secret is null or length(secret)<>64 then raise exception 'worker_secret_unavailable';end if;
 execute 'select net.http_post(url:=$1,body:=$2,headers:=$3,timeout_milliseconds:=120000)'
 using 'https://rcsca-v2.vercel.app/api/internal/admin-mail/run','{}'::jsonb,
 jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||secret);
end;$$;
revoke all on function private.dispatch_admin_mail_tick() from public,anon,authenticated;
