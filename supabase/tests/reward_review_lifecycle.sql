-- Run with psql -v ON_ERROR_STOP=1 -v member_id=<dedicated-test-member-uuid> -f this-file
-- Each scenario rolls back all fixtures, temporary roles and ledger changes.
begin;
select set_config('rcsca.test_member_id', :'member_id', true);
do $$ begin
 if not exists(select 1 from public.profiles where id=current_setting('rcsca.test_member_id')::uuid) then raise exception 'test_profile_missing'; end if;
 if exists(select 1 from public.admin_roles where user_id=current_setting('rcsca.test_member_id')::uuid) then raise exception 'use_unprivileged_test_member'; end if;
end $$;
insert into public.reward_catalog(category,title,point_cost,stock_total,stock_remaining,min_level,min_footprints,status)
values('daily','Synthetic rollback reward',10,2,2,1,0,'approved') returning set_config('rcsca.test_reward',id::text,true);
insert into public.point_transactions(user_id,tx_type,points,source_type,description) values(current_setting('rcsca.test_member_id')::uuid,'adjust',100,'e2e','Synthetic rollback funding');
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.test_member_id'),'role','authenticated')::text,true);
set local role authenticated;
select set_config('rcsca.test_redemption',public.reward_submit_redemption(current_setting('rcsca.test_reward')::uuid)::text,true);
do $$ begin
 begin perform public.reward_submit_redemption(current_setting('rcsca.test_reward')::uuid); raise exception 'duplicate_submission_allowed';
 exception when raise_exception then if sqlerrm<>'existing_redemption_pending' then raise; end if; end;
 begin perform public.admin_review_reward_redemption(current_setting('rcsca.test_redemption')::uuid,'approved'); raise exception 'member_approval_allowed';
 exception when raise_exception then if sqlerrm<>'admin_required' then raise; end if; end;
end $$;
reset role;
insert into public.admin_roles(user_id,role_key) values(current_setting('rcsca.test_member_id')::uuid,'admin');
set local role authenticated;
select public.admin_review_reward_redemption(current_setting('rcsca.test_redemption')::uuid,'approved','Synthetic approval');
do $$ begin
 begin perform public.admin_review_reward_redemption(current_setting('rcsca.test_redemption')::uuid,'approved'); raise exception 'duplicate_approval_allowed';
 exception when raise_exception then if sqlerrm<>'invalid_status_transition' then raise; end if; end;
 if (select count(*) from public.point_transactions where source_type='reward_redemption' and source_id=current_setting('rcsca.test_redemption')::uuid)<>1 then raise exception 'duplicate_spend'; end if;
 if (select sum(points) from public.point_transactions where source_type='reward_redemption' and source_id=current_setting('rcsca.test_redemption')::uuid)<>-10 then raise exception 'wrong_spend'; end if;
 if (select stock_remaining from public.reward_catalog where id=current_setting('rcsca.test_reward')::uuid)<>1 then raise exception 'wrong_stock'; end if;
end $$;
select public.account_set_notification_read((select id from public.user_notifications where related_id=current_setting('rcsca.test_redemption')::uuid and kind='reward_redemption'),true);
select public.admin_review_reward_redemption(current_setting('rcsca.test_redemption')::uuid,'completed');
do $$ begin
 if (select count(*) from public.user_notifications where related_id=current_setting('rcsca.test_redemption')::uuid and kind='reward_redemption')<>1 then raise exception 'wrong_notification_count'; end if;
 if not exists(select 1 from public.user_notifications where related_id=current_setting('rcsca.test_redemption')::uuid and body='這筆共享回饋已完成核銷。' and read_at is null) then raise exception 'notification_not_refreshed'; end if;
end $$;
do $$ begin
 begin perform public.admin_review_reward_redemption(current_setting('rcsca.test_redemption')::uuid,'completed'); raise exception 'duplicate_completion_allowed';
 exception when raise_exception then if sqlerrm<>'invalid_status_transition' then raise; end if; end;
end $$;
select set_config('rcsca.test_rejected',public.reward_submit_redemption(current_setting('rcsca.test_reward')::uuid)::text,true);
select public.admin_review_reward_redemption(current_setting('rcsca.test_rejected')::uuid,'rejected');
do $$ begin
 if exists(select 1 from public.point_transactions where source_id=current_setting('rcsca.test_rejected')::uuid) then raise exception 'rejection_spent_points'; end if;
 if (select stock_remaining from public.reward_catalog where id=current_setting('rcsca.test_reward')::uuid)<>1 then raise exception 'rejection_changed_stock'; end if;
end $$;
select set_config('rcsca.test_empty',public.reward_submit_redemption(current_setting('rcsca.test_reward')::uuid)::text,true);
reset role;
update public.reward_catalog set stock_remaining=0 where id=current_setting('rcsca.test_reward')::uuid;
set local role authenticated;
do $$ begin
 begin perform public.admin_review_reward_redemption(current_setting('rcsca.test_empty')::uuid,'approved'); raise exception 'empty_stock_approval_allowed';
 exception when raise_exception then if sqlerrm<>'out_of_stock' then raise; end if; end;
 if exists(select 1 from public.point_transactions where source_id=current_setting('rcsca.test_empty')::uuid) then raise exception 'empty_stock_spent_points'; end if;
end $$;
select 'PASS: duplicate submission/member approval denied; approval spends once; inventory decremented once; completion repeats denied; rejection and empty stock spend nothing; rolled back' as result;
rollback;
