begin;
select set_config('rcsca.guard_user',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data)
values(current_setting('rcsca.guard_user')::uuid,current_setting('rcsca.guard_user')||'@example.invalid','{}'::jsonb);
update public.profiles
set display_name='Guard User',mobile='0911222333',email='guard@example.invalid',is_active=true
where id=current_setting('rcsca.guard_user')::uuid;

-- Active authenticated traffic passes the pre-request check.
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.guard_user'),'role','authenticated')::text,true);
select set_config('request.path','rpc/point_wallet_self',true);
select public.rcsca_api_pre_request();

-- Deactivation scrubs the public profile copy of PII in the same transaction.
update public.profiles set is_active=false where id=current_setting('rcsca.guard_user')::uuid;
do $$ begin
 if (select is_active from public.profiles where id=current_setting('rcsca.guard_user')::uuid) then raise exception 'inactive_flag_missing'; end if;
 if (select display_name is not null or mobile is not null or email is not null from public.profiles where id=current_setting('rcsca.guard_user')::uuid) then raise exception 'inactive_profile_pii_not_scrubbed'; end if;
end $$;

-- Existing JWTs are blocked from ordinary Data API calls.
select set_config('request.path','rpc/point_wallet_self',true);
do $$ begin
 begin
   perform public.rcsca_api_pre_request();
   raise exception 'inactive_api_access_allowed';
 exception when sqlstate 'PGRST' then
   if sqlerrm not like '%account_inactive%' then raise; end if;
 end;
end $$;

-- The narrow status RPC path remains reachable so the web client can detect the
-- inactive state and globally sign out rather than looping on forbidden responses.
select set_config('request.path','rpc/account_status_self',true);
select public.rcsca_api_pre_request();
set local role authenticated;
do $$ declare v jsonb; begin
 v:=public.account_status_self();
 if v->>'active'<>'false' or v->>'profile_exists'<>'true' then raise exception 'inactive_status_wrong'; end if;
 if has_function_privilege('anon','public.account_status_self()','execute') then raise exception 'status_rpc_exposed_to_anon'; end if;
 if has_function_privilege('authenticated','public.rcsca_api_pre_request()','execute') then raise exception 'pre_request_directly_exposed'; end if;
end $$;
reset role;

-- Trusted service-role traffic is unaffected by user-profile deactivation.
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.guard_user'),'role','service_role')::text,true);
select set_config('request.path','rpc/internal_worker',true);
select public.rcsca_api_pre_request();

select 'PASS: inactive profiles are scrubbed and blocked at the Data API boundary; status self remains available for global sign-out; service role is unaffected';
rollback;
