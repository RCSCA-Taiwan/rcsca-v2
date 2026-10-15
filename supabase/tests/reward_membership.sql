-- Membership is a redemption gate, never an earning gate. All fixtures roll back.
begin;
select set_config('rcsca.test_member_id', :'member_id', true);
insert into public.reward_catalog(category,title,point_cost,stock_total,stock_remaining,status)
values('daily','Synthetic membership reward',10,3,3,'approved')
returning set_config('rcsca.membership_reward',id::text,true);
insert into public.point_transactions(user_id,tx_type,points,source_type,description)
select current_setting('rcsca.test_member_id')::uuid,'adjust',100-coalesce(sum(points),0),'e2e','Synthetic membership funding'
from public.point_transactions where user_id=current_setting('rcsca.test_member_id')::uuid
having 100-coalesce(sum(points),0)<>0;
update public.memberships set status='inactive' where user_id=current_setting('rcsca.test_member_id')::uuid;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.test_member_id'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
  begin perform public.reward_submit_redemption(current_setting('rcsca.membership_reward')::uuid);
    raise exception 'inactive_member_redeemed';
  exception when raise_exception then if sqlerrm<>'active_membership_required' then raise; end if; end;
end $$;
reset role;
delete from public.memberships where user_id=current_setting('rcsca.test_member_id')::uuid;
set local role authenticated;
do $$ begin
  begin perform public.reward_submit_redemption(current_setting('rcsca.membership_reward')::uuid);
    raise exception 'nonmember_redeemed';
  exception when raise_exception then if sqlerrm<>'active_membership_required' then raise; end if; end;
end $$;
reset role;
do $$ begin
  if (select sum(points) from public.point_transactions where user_id=current_setting('rcsca.test_member_id')::uuid)<>100
    then raise exception 'membership_changed_points'; end if;
end $$;
insert into public.memberships(user_id,membership_type,status)
values(current_setting('rcsca.test_member_id')::uuid,'annual','active');
set local role authenticated;
select set_config('rcsca.membership_redemption',public.reward_submit_redemption(current_setting('rcsca.membership_reward')::uuid)::text,true);
reset role;
insert into public.admin_roles(user_id,role_key) values(current_setting('rcsca.test_member_id')::uuid,'admin');
update public.memberships set status='inactive' where user_id=current_setting('rcsca.test_member_id')::uuid;
set local role authenticated;
do $$ begin
  begin perform public.admin_review_reward_redemption(current_setting('rcsca.membership_redemption')::uuid,'approved');
    raise exception 'inactive_member_approved';
  exception when raise_exception then if sqlerrm<>'active_membership_required' then raise; end if; end;
  begin perform public.admin_review_reward_redemption(current_setting('rcsca.membership_redemption')::uuid,null);
    raise exception 'null_decision_accepted';
  exception when raise_exception then if sqlerrm<>'invalid_decision' then raise; end if; end;
end $$;
reset role;
update public.memberships set status='active' where user_id=current_setting('rcsca.test_member_id')::uuid;
update public.reward_catalog set ends_at=now()-interval '1 minute' where id=current_setting('rcsca.membership_reward')::uuid;
set local role authenticated;
do $$ begin
  begin perform public.admin_review_reward_redemption(current_setting('rcsca.membership_redemption')::uuid,'approved');
    raise exception 'expired_reward_approved';
  exception when raise_exception then if sqlerrm<>'reward_ended' then raise; end if; end;
end $$;
reset role;
do $$ begin
  if exists(select 1 from public.point_transactions where source_type='reward_redemption' and source_id=current_setting('rcsca.membership_redemption')::uuid)
    then raise exception 'failed_approval_spent'; end if;
  if (select stock_remaining from public.reward_catalog where id=current_setting('rcsca.membership_reward')::uuid)<>3
    then raise exception 'failed_approval_changed_stock'; end if;
end $$;
update public.reward_catalog set ends_at=now()+interval '1 day' where id=current_setting('rcsca.membership_reward')::uuid;
set local role authenticated;
select public.admin_review_reward_redemption(current_setting('rcsca.membership_redemption')::uuid,'approved');
reset role;
do $$ begin
  if (select sum(points) from public.point_transactions where user_id=current_setting('rcsca.test_member_id')::uuid)<>90
    then raise exception 'wrong_approved_balance'; end if;
  if (select stock_remaining from public.reward_catalog where id=current_setting('rcsca.membership_reward')::uuid)<>2
    then raise exception 'wrong_approved_stock'; end if;
end $$;
select 'PASS: nonmember and inactive member blocked, points retained, approval rechecks membership and expiry, null decision denied, active member approval works; rolled back' as result;
rollback;
