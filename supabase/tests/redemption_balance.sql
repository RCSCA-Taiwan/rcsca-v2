-- psql -v ON_ERROR_STOP=1 -v member_id=<dedicated-unprivileged-test-member> -f this-file
-- Two different rewards compete for one 100-point balance; all fixtures roll back.
begin;
select set_config('rcsca.test_member_id', :'member_id', true);
do $$ begin
 if not exists(select 1 from public.profiles where id=current_setting('rcsca.test_member_id')::uuid) then raise exception 'test_profile_missing'; end if;
 if exists(select 1 from public.admin_roles where user_id=current_setting('rcsca.test_member_id')::uuid) then raise exception 'use_unprivileged_test_member'; end if;
end $$;
insert into public.reward_catalog(category,title,point_cost,stock_total,stock_remaining,min_level,min_footprints,status)
values('daily','Synthetic rollback reward A',70,2,2,1,0,'approved') returning set_config('rcsca.test_reward_a',id::text,true);
insert into public.reward_catalog(category,title,point_cost,stock_total,stock_remaining,min_level,min_footprints,status)
values('daily','Synthetic rollback reward B',70,2,2,1,0,'approved') returning set_config('rcsca.test_reward_b',id::text,true);
insert into public.point_transactions(user_id,tx_type,points,source_type,description)
select current_setting('rcsca.test_member_id')::uuid,'adjust',100-coalesce(sum(points),0),'e2e','Synthetic rollback funding'
from public.point_transactions where user_id=current_setting('rcsca.test_member_id')::uuid having 100-coalesce(sum(points),0)<>0;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.test_member_id'),'role','authenticated')::text,true);
set local role authenticated;
select set_config('rcsca.test_redemption_a',public.reward_submit_redemption(current_setting('rcsca.test_reward_a')::uuid)::text,true);
select set_config('rcsca.test_redemption_b',public.reward_submit_redemption(current_setting('rcsca.test_reward_b')::uuid)::text,true);
reset role;
insert into public.admin_roles(user_id,role_key) values(current_setting('rcsca.test_member_id')::uuid,'admin');
set local role authenticated;
select public.admin_review_reward_redemption(current_setting('rcsca.test_redemption_a')::uuid,'approved');
do $$ begin
 begin perform public.admin_review_reward_redemption(current_setting('rcsca.test_redemption_b')::uuid,'approved'); raise exception 'overspend_allowed';
 exception when raise_exception then if sqlerrm<>'insufficient_points' then raise; end if; end;
end $$;
reset role;
do $$ begin
 if (select sum(points) from public.point_transactions where user_id=current_setting('rcsca.test_member_id')::uuid)<>30 then raise exception 'wrong_remaining_balance'; end if;
 if exists(select 1 from public.point_transactions where source_id=current_setting('rcsca.test_redemption_b')::uuid) then raise exception 'failed_approval_spent_points'; end if;
 if not exists(select 1 from public.reward_redemptions where id=current_setting('rcsca.test_redemption_b')::uuid and status='submitted') then raise exception 'failed_approval_changed_status'; end if;
 if (select stock_remaining from public.reward_catalog where id=current_setting('rcsca.test_reward_b')::uuid)<>2 then raise exception 'failed_approval_changed_stock'; end if;
end $$;
select 'PASS: first reward spends 70, second denied; balance 30, second inventory/status untouched; rolled back' as result;
rollback;
