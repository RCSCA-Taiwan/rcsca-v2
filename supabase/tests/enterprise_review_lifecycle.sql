-- psql -v ON_ERROR_STOP=1 -v member_id=<dedicated-unprivileged-test-member> -f this-file
begin;
select set_config('rcsca.test_member_id', :'member_id', true);
do $$ begin
 if not exists(select 1 from public.profiles where id=current_setting('rcsca.test_member_id')::uuid) then raise exception 'test_profile_missing'; end if;
 if exists(select 1 from public.admin_roles where user_id=current_setting('rcsca.test_member_id')::uuid) then raise exception 'use_unprivileged_test_member'; end if;
end $$;
insert into public.enterprise_applications(requester_user_id,company_name,tax_id,contact_name,contact_email)
values(current_setting('rcsca.test_member_id')::uuid,'Synthetic rollback enterprise','E2E-'||gen_random_uuid()::text,'Test','e2e@example.invalid')
returning set_config('rcsca.test_application',id::text,true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.test_member_id'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 begin perform public.admin_review_enterprise_application(current_setting('rcsca.test_application')::uuid,'approved'); raise exception 'member_review_allowed';
 exception when raise_exception then if sqlerrm<>'admin_required' then raise; end if; end;
end $$;
reset role;
insert into public.admin_roles(user_id,role_key) values(current_setting('rcsca.test_member_id')::uuid,'case_manager');
set local role authenticated;
do $$ begin
 begin perform public.admin_review_enterprise_application(current_setting('rcsca.test_application')::uuid,'needs_info','Synthetic note'); raise exception 'case_manager_review_allowed';
 exception when raise_exception then if sqlerrm<>'admin_required' then raise; end if; end;
end $$;
reset role;
delete from public.admin_roles where user_id=current_setting('rcsca.test_member_id')::uuid and role_key='case_manager';
insert into public.admin_roles(user_id,role_key) values(current_setting('rcsca.test_member_id')::uuid,'enterprise_reviewer');
set local role authenticated;
do $$ begin
 begin perform public.admin_review_enterprise_application(current_setting('rcsca.test_application')::uuid,'needs_info',' '); raise exception 'blank_note_allowed';
 exception when raise_exception then if sqlerrm<>'note_required' then raise; end if; end;
end $$;
select public.admin_review_enterprise_application(current_setting('rcsca.test_application')::uuid,'needs_info','Synthetic supplemental request');
select public.account_set_notification_read((select id from public.user_notifications where related_id=current_setting('rcsca.test_application')::uuid and kind='enterprise_application'),true);
select set_config('rcsca.test_enterprise',public.admin_review_enterprise_application(current_setting('rcsca.test_application')::uuid,'approved')::text,true);
do $$ begin
 begin perform public.admin_review_enterprise_application(current_setting('rcsca.test_application')::uuid,'approved'); raise exception 'repeat_review_allowed';
 exception when raise_exception then if sqlerrm<>'invalid_status_transition' then raise; end if; end;
end $$;
reset role;
do $$ begin
 if not exists(select 1 from public.enterprise_applications where id=current_setting('rcsca.test_application')::uuid and status='approved') then raise exception 'approval_missing'; end if;
 if not exists(select 1 from public.enterprise_users where enterprise_id=current_setting('rcsca.test_enterprise')::uuid and user_id=current_setting('rcsca.test_member_id')::uuid and role='manager') then raise exception 'manager_link_missing'; end if;
 if (select count(*) from public.user_notifications where related_id=current_setting('rcsca.test_application')::uuid and kind='enterprise_application')<>1 then raise exception 'duplicate_notification'; end if;
 if not exists(select 1 from public.user_notifications where related_id=current_setting('rcsca.test_application')::uuid and body='企業身份已核准並連結到你的帳號。' and read_at is null) then raise exception 'notification_not_refreshed'; end if;
end $$;
select 'PASS: enterprise role boundary, needs-info note, approval/link/notification, repeat-review denial; all rolled back' as result;
rollback;
