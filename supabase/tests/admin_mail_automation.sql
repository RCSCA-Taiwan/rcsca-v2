-- Disposable replay database only. Every fixture/config change rolls back;
-- no scheduler registration, Vault token or SMTP/network call is involved.
begin;
select set_config('request.jwt.claims',jsonb_build_object('sub',:'member_id','role','authenticated')::text,true);
set local role authenticated;
do $$begin
 begin perform public.admin_mail_set_automatic(true,true);raise exception 'member_enabled_automation';
 exception when raise_exception then if sqlerrm<>'admin_required' then raise;end if;end;
end$$;
reset role;
insert into public.admin_roles(user_id,role_key) values(:'member_id','admin');
set local role authenticated;
do $$begin
 begin perform public.admin_mail_set_automatic(true,true);raise exception 'unconfigured_automation_enabled';
 exception when raise_exception then if sqlerrm<>'automation_not_ready' then raise;end if;end;
end$$;
reset role;
update private.admin_mail_worker_config set token_hash=sha256(convert_to(repeat('a',64),'UTF8')),
 scheduler_ready=true,worker_seen_at=now(),scheduler_tick_at=now() where singleton;
set local role anon;
do $$begin
 begin perform public.admin_mail_worker(repeat('b',64),'begin');raise exception 'wrong_token_accepted';
 exception when raise_exception then if sqlerrm<>'worker_required' then raise;end if;end;
 if public.admin_mail_worker(repeat('a',64),'begin')->>'state'<>'paused' then raise exception 'not_paused';end if;
 if has_table_privilege('anon','private.admin_mail_worker_config','SELECT') then raise exception 'worker_config_exposed';end if;
end$$;
reset role;
set local role authenticated;
do $$begin
 begin perform public.admin_mail_set_automatic(true,false);raise exception 'receipt_not_required';
 exception when raise_exception then if sqlerrm<>'automation_not_ready' then raise;end if;end;
end$$;
select public.admin_mail_set_automatic(true,true);
reset role;
insert into private.site_mail_routing(recipient_email) values('automation@example.invalid') on conflict(singleton) do update set recipient_email=excluded.recipient_email;
-- Isolate due fixtures from any other pending synthetic workflow rows.
update private.admin_mail_outbox set retry_after=now()+interval '1 day' where state='pending';
insert into public.enterprise_applications(requester_user_id,company_name,tax_id,contact_name,contact_email)
select :'member_id','Synthetic automation source','AUTO-'||gen_random_uuid()::text,'Synthetic','automation@example.invalid' from generate_series(1,4);
set local role anon;
select set_config('rcsca.worker_run',(public.admin_mail_worker(repeat('a',64),'begin')->>'id'),true);
do $$begin
 if public.admin_mail_worker(repeat('a',64),'begin')->>'state'<>'busy' then raise exception 'overlapping_worker_run';end if;
end$$;
select set_config('rcsca.worker_claim',public.admin_mail_worker(repeat('a',64),'claim',current_setting('rcsca.worker_run')::uuid)::text,true);
do $$declare c jsonb:=current_setting('rcsca.worker_claim')::jsonb;r uuid:=current_setting('rcsca.worker_run')::uuid;begin
 begin perform public.admin_mail_worker(repeat('a',64),'finish',r,(c->>'id')::uuid,gen_random_uuid(),'accepted');raise exception 'wrong_lease_accepted';
 exception when raise_exception then if sqlerrm<>'stale_mail_attempt' then raise;end if;end;
 perform public.admin_mail_worker(repeat('a',64),'finish',r,(c->>'id')::uuid,(c->>'lease_id')::uuid,'failed','connection_failed');
end$$;
reset role;
do $$begin
 if not exists(select 1 from private.admin_mail_outbox where id=(current_setting('rcsca.worker_claim')::jsonb->>'id')::uuid and state='pending' and retry_after>=now()+interval '1 minute') then raise exception 'missing_durable_backoff';end if;
 if not exists(select 1 from private.admin_mail_attempts where lease_id=(current_setting('rcsca.worker_claim')::jsonb->>'lease_id')::uuid and state='failed') then raise exception 'missing_attempt_history';end if;
end$$;
set local role anon;
select set_config('rcsca.worker_unknown',public.admin_mail_worker(repeat('a',64),'claim',current_setting('rcsca.worker_run')::uuid)::text,true);
do $$declare c jsonb:=current_setting('rcsca.worker_unknown')::jsonb;r uuid:=current_setting('rcsca.worker_run')::uuid;begin
 perform public.admin_mail_worker(repeat('a',64),'finish',r,(c->>'id')::uuid,(c->>'lease_id')::uuid,'unknown','unconfirmed');
 c:=public.admin_mail_worker(repeat('a',64),'claim',r);
 perform public.admin_mail_worker(repeat('a',64),'finish',r,(c->>'id')::uuid,(c->>'lease_id')::uuid,'accepted');
 if public.admin_mail_worker(repeat('a',64),'claim',r) is not null then raise exception 'run_cap_ignored';end if;
 perform public.admin_mail_worker(repeat('a',64),'close',r,p_outcome=>'completed');
end$$;
reset role;
do $$begin
 if not exists(select 1 from private.admin_mail_outbox where id=(current_setting('rcsca.worker_unknown')::jsonb->>'id')::uuid and state='unknown') then raise exception 'unknown_auto_retried';end if;
end$$;
-- A valid running worker must honor a subsequent admin pause.
set local role anon;
select set_config('rcsca.worker_run',(public.admin_mail_worker(repeat('a',64),'begin')->>'id'),true);
reset role;
set local role authenticated;
select public.admin_mail_set_automatic(false,false);
reset role;
set local role anon;
do $$begin
 if public.admin_mail_worker(repeat('a',64),'claim',current_setting('rcsca.worker_run')::uuid) is not null then raise exception 'pause_ignored';end if;
end$$;
reset role;
do $$begin
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('admin_mail_worker','admin_mail_set_automatic') and p.prosecdef) then raise exception 'privileged_public_rpc';end if;
 if has_function_privilege('anon','private.dispatch_admin_mail_tick()','EXECUTE') then raise exception 'scheduler_exposed';end if;
 if private.admin_mail_queue()::text ~ 'token_hash|vault_secret_id|recipient_email' then raise exception 'queue_leaks_secret';end if;
end$$;
rollback;
select 'PASS: default-off automation, capability auth, admin enable/pause, exclusive run, three-message cap, lease ownership, durable backoff, unknown no-retry and private queue';
