begin;
select set_config('rcsca.guard_user',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data)
values(current_setting('rcsca.guard_user')::uuid,current_setting('rcsca.guard_user')||'@example.invalid','{}'::jsonb);
update public.profiles
set display_name='Guard User',mobile='0911222333',email='guard@example.invalid',is_active=true
where id=current_setting('rcsca.guard_user')::uuid;

-- PostgREST invokes the pre-request hook after switching to the request role, so all
-- expected API roles must be able to execute it. Authorization still happens inside
-- the hook itself.
do $$ begin
 if not has_function_privilege('anon','public.rcsca_api_pre_request()','execute') then raise exception 'anon_hook_execute_missing'; end if;
 if not has_function_privilege('authenticated','public.rcsca_api_pre_request()','execute') then raise exception 'authenticated_hook_execute_missing'; end if;
 if not has_function_privilege('service_role','public.rcsca_api_pre_request()','execute') then raise exception 'service_hook_execute_missing'; end if;
 if not has_function_privilege('authenticator','public.rcsca_api_pre_request()','execute') then raise exception 'authenticator_hook_execute_missing'; end if;
end $$;

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

-- Existing JWTs are blocked from ordinary Data API calls, including direct attempts
-- to call the hook itself on a non-status RPC path.
select set_config('request.path','rpc/point_wallet_self',true);
do $$ begin
 begin
   perform public.rcsca_api_pre_request();
   raise exception 'inactive_api_access_allowed';
 exception when sqlstate 'PGRST' then
   if sqlerrm not like '%account_inactive%' then raise; end if;
 end;
end $$;
select set_config('request.path','rpc/rcsca_api_pre_request',true);
do $$ begin
 begin
   perform public.rcsca_api_pre_request();
   raise exception 'inactive_direct_hook_call_allowed';
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
end $$;
reset role;

-- Storage is outside PostgREST, so every authenticated member-media policy that can
-- expose private community media or mutate member-owned objects must also require an
-- active profile. Public partner-offer reads intentionally remain public.
do $$ declare v_missing text; begin
 select string_agg(policyname,', ' order by policyname) into v_missing
 from pg_policies
 where schemaname='storage' and tablename='objects'
   and policyname in ('community_image_read','community_image_upload','community_unused_image_delete','partner_offer_image_upload','partner_offer_unused_image_delete')
   and coalesce(qual,'')||' '||coalesce(with_check,'') not ilike '%is_active%';
 if v_missing is not null then raise exception 'inactive_storage_guard_missing: %',v_missing; end if;
 if (select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname in ('community_image_read','community_image_upload','community_unused_image_delete','partner_offer_image_upload','partner_offer_unused_image_delete'))<>5 then
   raise exception 'inactive_storage_policy_count_wrong';
 end if;
end $$;

-- Trusted service-role traffic is unaffected by user-profile deactivation.
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.guard_user'),'role','service_role')::text,true);
select set_config('request.path','rpc/internal_worker',true);
select public.rcsca_api_pre_request();

select 'PASS: inactive profiles are scrubbed and blocked at Data API + authenticated member Storage boundaries; PostgREST API roles can execute the hook; status self remains available for global sign-out; service role is unaffected';
rollback;
