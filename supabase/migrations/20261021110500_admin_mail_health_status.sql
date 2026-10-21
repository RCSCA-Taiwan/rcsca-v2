-- Make automatic admin-mail operations fail-visible to administrators.
-- This only exposes derived health metadata through the existing admin-only
-- queue RPC. Credentials, recipient addresses and worker tokens remain private.
create or replace function private.admin_mail_queue()
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 result jsonb;
 automatic_enabled boolean;
 manual_enabled boolean;
 scheduler_ready boolean;
 token_ready boolean;
 scheduler_tick_at timestamptz;
 worker_seen_at timestamptz;
 health text;
 unknown_count bigint;
 terminal_failed_count bigint;
 oldest_pending_at timestamptz;
 last_accepted_at timestamptz;
begin
 if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 perform private.expire_admin_mail_leases();

 select c.manual_enabled,c.automatic_enabled,w.scheduler_ready,w.token_hash is not null,w.scheduler_tick_at,w.worker_seen_at
 into manual_enabled,automatic_enabled,scheduler_ready,token_ready,scheduler_tick_at,worker_seen_at
 from private.admin_mail_control c cross join private.admin_mail_worker_config w
 where c.singleton and w.singleton;

 select count(*) filter(where state='unknown'),
        count(*) filter(where state='failed' and attempts>=5),
        min(created_at) filter(where state='pending'),
        max(accepted_at) filter(where state='accepted')
 into unknown_count,terminal_failed_count,oldest_pending_at,last_accepted_at
 from private.admin_mail_outbox;

 health:=case
  when not automatic_enabled then 'paused'
  when not scheduler_ready or not token_ready then 'not_ready'
  when scheduler_tick_at is null or scheduler_tick_at<=now()-interval '15 minutes' then 'scheduler_stale'
  when worker_seen_at is null or worker_seen_at<=now()-interval '15 minutes' then 'worker_stale'
  when unknown_count>0 or terminal_failed_count>0 then 'attention'
  else 'healthy'
 end;

 select jsonb_build_object(
  'manual_enabled',manual_enabled,
  'automatic_enabled',automatic_enabled,
  'automatic_ready',scheduler_ready and token_ready and worker_seen_at is not null and scheduler_tick_at>now()-interval '15 minutes',
  'automatic_health',health,
  'scheduler_tick_at',scheduler_tick_at,
  'worker_seen_at',worker_seen_at,
  'last_accepted_at',last_accepted_at,
  'oldest_pending_at',oldest_pending_at,
  'attention_counts',jsonb_build_object('unknown',unknown_count,'terminal_failed',terminal_failed_count),
  'last_run',(select jsonb_build_object('state',r.state,'claimed',r.claimed,'started_at',r.started_at,'finished_at',r.finished_at)
   from private.admin_mail_runs r order by r.started_at desc limit 1),
  'items',coalesce((select jsonb_agg(item order by created_at desc,id desc) from (
   select id,source_kind,state,attempts,failure_code,created_at,updated_at,accepted_at,retry_after
   from private.admin_mail_outbox order by created_at desc,id desc limit 50
  ) item),'[]'::jsonb),
  'counts',coalesce((select jsonb_object_agg(state,total) from (
   select state,count(*) total from private.admin_mail_outbox group by state
  ) counts),'{}'::jsonb)
 ) into result;
 return result;
end;$$;
