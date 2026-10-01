begin;
select set_config('rcsca.test_member_id', :'member_id', true);
do $$ begin
 if not exists(select 1 from public.profiles where id=current_setting('rcsca.test_member_id')::uuid) then raise exception 'test_profile_missing'; end if;
 if exists(select 1 from public.admin_roles where user_id=current_setting('rcsca.test_member_id')::uuid) then raise exception 'use_unprivileged_test_member'; end if;
end $$;
insert into public.enterprises(tax_id,legal_name,status)
values('REPLAY-'||gen_random_uuid(),'Rollback share lifecycle','approved')
returning set_config('rcsca.test_enterprise',id::text,true);
insert into public.enterprise_users(enterprise_id,user_id,role)
values(current_setting('rcsca.test_enterprise')::uuid,current_setting('rcsca.test_member_id')::uuid,'manager');
insert into public.enterprise_shares(enterprise_id,share_type,title,status)
values(current_setting('rcsca.test_enterprise')::uuid,'resource','Rollback share lifecycle','submitted')
returning set_config('rcsca.test_share',id::text,true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.test_member_id'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 begin perform public.admin_review_enterprise_share(current_setting('rcsca.test_share')::uuid,'approved'); raise exception 'member_review_allowed';
 exception when raise_exception then if sqlerrm<>'insufficient_privilege' then raise; end if; end;
end $$;
reset role;
insert into public.admin_roles(user_id,role_key) values(current_setting('rcsca.test_member_id')::uuid,'case_manager');
set local role authenticated;
do $$ begin
 begin perform public.admin_review_enterprise_share(current_setting('rcsca.test_share')::uuid,'approved'); raise exception 'case_manager_review_allowed';
 exception when raise_exception then if sqlerrm<>'insufficient_privilege' then raise; end if; end;
end $$;
reset role;
delete from public.admin_roles where user_id=current_setting('rcsca.test_member_id')::uuid and role_key='case_manager';
insert into public.admin_roles(user_id,role_key) values(current_setting('rcsca.test_member_id')::uuid,'enterprise_reviewer');
set local role authenticated;
do $$ begin
 begin perform public.admin_review_enterprise_share(current_setting('rcsca.test_share')::uuid,null); raise exception 'null_decision_allowed';
 exception when raise_exception then if sqlerrm<>'invalid_decision' then raise; end if; end;
 begin perform public.admin_review_enterprise_share(current_setting('rcsca.test_share')::uuid,'needs_info',false,' '); raise exception 'blank_note_allowed';
 exception when raise_exception then if sqlerrm<>'note_required' then raise; end if; end;
end $$;
select public.admin_review_enterprise_share(current_setting('rcsca.test_share')::uuid,'needs_info',false,'Add details');
do $$ begin
 begin perform public.admin_review_enterprise_share(current_setting('rcsca.test_share')::uuid,'approved'); raise exception 'unresubmitted_review_allowed';
 exception when raise_exception then if sqlerrm<>'invalid_status_transition' then raise; end if; end;
end $$;
select public.account_set_notification_read((select id from public.user_notifications where related_id=current_setting('rcsca.test_share')::uuid and kind='enterprise_share_review'),true);
reset role;
delete from public.admin_roles where user_id=current_setting('rcsca.test_member_id')::uuid and role_key='enterprise_reviewer';
set local role authenticated;
select public.enterprise_resubmit_share(current_setting('rcsca.test_share')::uuid,'Revised sharing','More detail');
reset role;
insert into public.admin_roles(user_id,role_key) values(current_setting('rcsca.test_member_id')::uuid,'enterprise_reviewer');
set local role authenticated;
select public.admin_review_enterprise_share(current_setting('rcsca.test_share')::uuid,'needs_info',false,'One more detail');
select public.enterprise_resubmit_share(current_setting('rcsca.test_share')::uuid,'Final sharing','Complete detail');
select public.admin_review_enterprise_share(current_setting('rcsca.test_share')::uuid,'approved',false,'Verified sharing');
do $$ begin
 begin perform public.admin_review_enterprise_share(current_setting('rcsca.test_share')::uuid,'approved',true); raise exception 'repeat_approval_allowed';
 exception when raise_exception then if sqlerrm<>'invalid_status_transition' then raise; end if; end;
 begin perform public.admin_review_enterprise_share(current_setting('rcsca.test_share')::uuid,'rejected'); raise exception 'approved_rejection_allowed';
 exception when raise_exception then if sqlerrm<>'invalid_status_transition' then raise; end if; end;
end $$;
reset role;
do $$ begin
 if not exists(select 1 from public.enterprise_shares where id=current_setting('rcsca.test_share')::uuid and status='approved' and public_result=false and title='Final sharing') then raise exception 'share_state_wrong'; end if;
 if (select count(*) from public.user_notifications where related_id=current_setting('rcsca.test_share')::uuid and kind='enterprise_share_review')<>1 then raise exception 'duplicate_notification'; end if;
 if not exists(select 1 from public.user_notifications where related_id=current_setting('rcsca.test_share')::uuid and title='企業共享內容已核准' and body='Verified sharing' and read_at is null) then raise exception 'notification_not_refreshed'; end if;
 if (select count(*) from public.audit_logs where subject_type='enterprise_share' and subject_id=current_setting('rcsca.test_share') and action='review_enterprise_share')<>3 then raise exception 'review_audit_wrong'; end if;
end $$;
select 'PASS: enterprise sharing role boundary, two correction rounds, pending-only review, one refreshed notification, approved content preserved; rolled back' as result;
rollback;
