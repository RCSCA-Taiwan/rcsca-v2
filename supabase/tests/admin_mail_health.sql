-- Disposable replay database only. Verifies derived health states without any
-- scheduler registration, Vault read, SMTP connection or outbound message.
begin;
select set_config('request.jwt.claims',jsonb_build_object('sub',:'member_id','role','authenticated')::text,true);
insert into public.admin_roles(user_id,role_key) values(:'member_id','admin') on conflict do nothing;
update private.admin_mail_control set automatic_enabled=true where singleton;
update private.admin_mail_worker_config set scheduler_ready=true,token_hash=sha256(convert_to(repeat('a',64),'UTF8')),
 scheduler_tick_at=now(),worker_seen_at=now() where singleton;

do $$declare q jsonb;begin
 q:=private.admin_mail_queue();
 if q->>'automatic_health'<>'healthy' then raise exception 'healthy_state_missing: %',q->>'automatic_health';end if;
 if q::text ~ 'token_hash|vault_secret_id|recipient_email' then raise exception 'health_queue_leaks_secret';end if;
end$$;

update private.admin_mail_worker_config set scheduler_tick_at=now()-interval '16 minutes',worker_seen_at=now() where singleton;
do $$declare q jsonb;begin
 q:=private.admin_mail_queue();
 if q->>'automatic_health'<>'scheduler_stale' then raise exception 'scheduler_stale_missing: %',q->>'automatic_health';end if;
end$$;

update private.admin_mail_worker_config set scheduler_tick_at=now(),worker_seen_at=now()-interval '16 minutes' where singleton;
do $$declare q jsonb;begin
 q:=private.admin_mail_queue();
 if q->>'automatic_health'<>'worker_stale' then raise exception 'worker_stale_missing: %',q->>'automatic_health';end if;
end$$;

update private.admin_mail_worker_config set scheduler_tick_at=now(),worker_seen_at=now() where singleton;
insert into private.admin_mail_outbox(source_kind,source_id,submission,state,attempts,failure_code)
values
 ('support_cases',gen_random_uuid(),1,'unknown',1,'unconfirmed'),
 ('support_cases',gen_random_uuid(),1,'failed',5,'connection_failed');
do $$declare q jsonb;begin
 q:=private.admin_mail_queue();
 if q->>'automatic_health'<>'attention' then raise exception 'attention_state_missing: %',q->>'automatic_health';end if;
 if (q#>>'{attention_counts,unknown}')::int<>1 or (q#>>'{attention_counts,terminal_failed}')::int<>1 then
  raise exception 'attention_counts_wrong: %',q->'attention_counts';
 end if;
end$$;

update private.admin_mail_control set automatic_enabled=false where singleton;
do $$declare q jsonb;begin
 q:=private.admin_mail_queue();
 if q->>'automatic_health'<>'paused' then raise exception 'paused_state_missing: %',q->>'automatic_health';end if;
end$$;
rollback;
select 'PASS: admin mail health distinguishes healthy, stale scheduler, stale worker, attention and paused without leaking private routing';
