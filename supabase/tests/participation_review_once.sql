-- Run with psql -v ON_ERROR_STOP=1 -v member_id=<dedicated-test-member-uuid> -f this-file
-- Each scenario rolls back all fixtures, temporary roles and ledger changes.
begin;
select set_config('rcsca.test_member_id', :'member_id', true);
do $$ begin
 if not exists(select 1 from public.profiles where id=current_setting('rcsca.test_member_id')::uuid) then raise exception 'test_profile_missing'; end if;
 if exists(select 1 from public.admin_roles where user_id=current_setting('rcsca.test_member_id')::uuid) then raise exception 'use_unprivileged_test_member'; end if;
end $$;
insert into public.activities(code,name,status) values('E2E-REVIEW-'||gen_random_uuid()::text,'Synthetic review test','active') returning set_config('rcsca.test_activity',id::text,true);
insert into public.activity_participations(activity_id,user_id,participation_type,status) values(current_setting('rcsca.test_activity')::uuid,current_setting('rcsca.test_member_id')::uuid,'participant','pending') returning set_config('rcsca.test_part',id::text,true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.test_member_id'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 begin perform public.admin_verify_participation(current_setting('rcsca.test_part')::uuid,true); raise exception 'member_review_allowed';
 exception when raise_exception then if sqlerrm<>'insufficient_privilege' then raise; end if; end;
end $$;
reset role;
insert into public.admin_roles(user_id,role_key) values(current_setting('rcsca.test_member_id')::uuid,'activity_reviewer');
set local role authenticated;
select public.admin_verify_participation(current_setting('rcsca.test_part')::uuid,true,'Synthetic first approval');
do $$ begin
 begin perform public.admin_verify_participation(current_setting('rcsca.test_part')::uuid,true); raise exception 'duplicate_approval_allowed';
 exception when raise_exception then if sqlerrm<>'participation_already_reviewed' then raise; end if; end;
 begin perform public.admin_verify_participation(current_setting('rcsca.test_part')::uuid,false); raise exception 'approval_reversal_allowed';
 exception when raise_exception then if sqlerrm<>'participation_already_reviewed' then raise; end if; end;
 if (select count(*) from public.sharing_footprints where source_type='activity_participation' and source_id=current_setting('rcsca.test_part')::uuid)<>1 then raise exception 'wrong_footprint_count'; end if;
 if not exists(select 1 from public.activity_participations where id=current_setting('rcsca.test_part')::uuid and status='verified') then raise exception 'status_changed'; end if;
end $$;
select 'PASS: member denied, approval once, duplicate approval/reversal denied, one footprint; rolled back' as result;
rollback;
