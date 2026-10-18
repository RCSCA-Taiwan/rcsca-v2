-- pg_net queue headers are readable by database roles on hosted Supabase.
-- Send a short-lived, one-use signature, never the long-lived Vault key.
create table private.admin_mail_ticks (
 id uuid primary key default gen_random_uuid(),
 issued_seconds bigint not null,
 verification boolean not null,
 expires_at timestamptz not null default now()+interval '2 minutes',
 consumed_at timestamptz
);
create index admin_mail_ticks_expiry on private.admin_mail_ticks(expires_at);
alter table private.admin_mail_ticks enable row level security;
revoke all on private.admin_mail_ticks from public,anon,authenticated;

create function private.make_admin_mail_tick(p_verify boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg private.admin_mail_worker_config; secret text; nonce uuid; stamp bigint; mode text; signature text;
begin
 if p_verify is null then raise exception 'invalid_tick_mode';end if;
 select * into cfg from private.admin_mail_worker_config where singleton;
 update private.admin_mail_worker_config set scheduler_tick_at=now() where singleton;
 -- Only temporary request markers are pruned, never outbox/attempt history.
 delete from private.admin_mail_ticks where expires_at<now()-interval '7 days';
 if not p_verify and (not cfg.scheduler_ready or not (select automatic_enabled from private.admin_mail_control where singleton)) then return null;end if;
 if cfg.vault_secret_id is null then raise exception 'worker_secret_unavailable';end if;
 execute 'select decrypted_secret from vault.decrypted_secrets where id=$1' into secret using cfg.vault_secret_id;
 if secret is null or secret !~ '^[a-f0-9]{64}$' or sha256(convert_to(secret,'UTF8')) is distinct from cfg.token_hash then raise exception 'worker_secret_unavailable';end if;
 stamp:=floor(extract(epoch from clock_timestamp()))::bigint;
 mode:=case when p_verify then 'verify' else 'run' end;
 insert into private.admin_mail_ticks(issued_seconds,verification) values(stamp,p_verify) returning id into nonce;
 signature:=encode(extensions.hmac('POST'||chr(10)||'/api/internal/admin-mail/run'||chr(10)||stamp::text||chr(10)||nonce::text||chr(10)||mode,secret,'sha256'),'hex');
 return jsonb_build_object('Content-Type','application/json','X-RCSCA-Mail-Time',stamp::text,
 'X-RCSCA-Mail-Nonce',nonce::text,'X-RCSCA-Mail-Mode',mode,'X-RCSCA-Mail-Signature',signature);
end;$$;
revoke all on function private.make_admin_mail_tick(boolean) from public,anon,authenticated;

create function private.consume_admin_mail_tick(p_token text,p_nonce uuid,p_seconds bigint,p_verification boolean)
returns boolean language plpgsql security definer set search_path='' as $$
declare expected bytea;
begin
 select token_hash into expected from private.admin_mail_worker_config where singleton;
 if p_token is null or length(p_token)<>64 or expected is null or sha256(convert_to(p_token,'UTF8'))<>expected then raise exception 'worker_required';end if;
 update private.admin_mail_ticks set consumed_at=now()
 where id=p_nonce and issued_seconds=p_seconds and verification=p_verification and consumed_at is null and expires_at>now();
 if not found then return false;end if;
 update private.admin_mail_worker_config set worker_seen_at=now() where singleton;
 return true;
end;$$;
create function public.consume_admin_mail_tick(p_token text,p_nonce uuid,p_seconds bigint,p_verification boolean)
returns boolean language sql security invoker set search_path='' as $$select private.consume_admin_mail_tick(p_token,p_nonce,p_seconds,p_verification);$$;
revoke all on function private.consume_admin_mail_tick(text,uuid,bigint,boolean),public.consume_admin_mail_tick(text,uuid,bigint,boolean) from public;
grant execute on function private.consume_admin_mail_tick(text,uuid,bigint,boolean),public.consume_admin_mail_tick(text,uuid,bigint,boolean) to anon,authenticated;

create function private.queue_admin_mail_tick(p_verify boolean default false)
returns bigint language plpgsql security definer set search_path='' as $$
declare headers jsonb; request_id bigint;
begin
 headers:=private.make_admin_mail_tick(p_verify);
 if headers is null then return null;end if;
 execute 'select net.http_post(url:=$1,body:=$2,headers:=$3,timeout_milliseconds:=120000)'
 into request_id using 'https://rcsca-v2.vercel.app/api/internal/admin-mail/run','{}'::jsonb,headers;
 return request_id;
end;$$;
revoke all on function private.queue_admin_mail_tick(boolean) from public,anon,authenticated;
create or replace function private.dispatch_admin_mail_tick()
returns void language plpgsql security definer set search_path='' as $$begin perform private.queue_admin_mail_tick(false);end;$$;
revoke all on function private.dispatch_admin_mail_tick() from public,anon,authenticated;
