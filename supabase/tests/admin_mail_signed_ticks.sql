begin;
update private.admin_mail_worker_config set token_hash=sha256(convert_to(repeat('a',64),'UTF8')),
 vault_secret_id=vault.create_secret(repeat('a',64)),scheduler_ready=false,worker_seen_at=null where singleton;
do $$begin
 if private.make_admin_mail_tick(false) is not null then raise exception 'paused_tick_issued';end if;
 if has_table_privilege('anon','private.admin_mail_ticks','SELECT') or has_function_privilege('authenticated','private.make_admin_mail_tick(boolean)','EXECUTE') then raise exception 'tick_privileges_exposed';end if;
end$$;
select set_config('rcsca.signed_tick',private.make_admin_mail_tick(true)::text,true);
do $$declare h jsonb:=current_setting('rcsca.signed_tick')::jsonb;begin
 if h ? 'Authorization' or h::text like '%'||repeat('a',64)||'%' then raise exception 'long_lived_secret_in_headers';end if;
 if h->>'X-RCSCA-Mail-Mode'<>'verify' then raise exception 'wrong_mode';end if;
end$$;
set local role anon;
do $$declare h jsonb:=current_setting('rcsca.signed_tick')::jsonb;begin
 begin perform public.consume_admin_mail_tick(repeat('b',64),(h->>'X-RCSCA-Mail-Nonce')::uuid,(h->>'X-RCSCA-Mail-Time')::bigint,true);raise exception 'invalid_worker_token_accepted';
 exception when raise_exception then if sqlerrm<>'worker_required' then raise;end if;end;
 if public.consume_admin_mail_tick(repeat('a',64),(h->>'X-RCSCA-Mail-Nonce')::uuid,(h->>'X-RCSCA-Mail-Time')::bigint,false) then raise exception 'changed_mode_consumed';end if;
 if not public.consume_admin_mail_tick(repeat('a',64),(h->>'X-RCSCA-Mail-Nonce')::uuid,(h->>'X-RCSCA-Mail-Time')::bigint,true) then raise exception 'valid_tick_rejected';end if;
 if public.consume_admin_mail_tick(repeat('a',64),(h->>'X-RCSCA-Mail-Nonce')::uuid,(h->>'X-RCSCA-Mail-Time')::bigint,true) then raise exception 'replay_accepted';end if;
end$$;
reset role;
select set_config('rcsca.expired_tick',private.make_admin_mail_tick(true)::text,true);
update private.admin_mail_ticks set expires_at=now()-interval '1 second' where id=(current_setting('rcsca.expired_tick')::jsonb->>'X-RCSCA-Mail-Nonce')::uuid;
set local role anon;
do $$declare h jsonb:=current_setting('rcsca.expired_tick')::jsonb;begin
 if public.consume_admin_mail_tick(repeat('a',64),(h->>'X-RCSCA-Mail-Nonce')::uuid,(h->>'X-RCSCA-Mail-Time')::bigint,true) then raise exception 'expired_tick_accepted';end if;
end$$;
reset role;
do $$begin
 if (select prosecdef from pg_proc where oid='public.consume_admin_mail_tick(text,uuid,bigint,boolean)'::regprocedure) then raise exception 'privileged_public_tick_rpc';end if;
 if not (select worker_seen_at is not null from private.admin_mail_worker_config where singleton) then raise exception 'missing_verified_heartbeat';end if;
end$$;
rollback;
select 'PASS: paused scheduler issues no request; verification headers contain no reusable key; nonce is private, mode-bound, expiry-bound and consumed once; exposed RPC is invoker-only';
