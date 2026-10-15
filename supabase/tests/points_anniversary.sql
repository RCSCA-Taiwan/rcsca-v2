-- No fixture or balance change survives this transaction.
begin;
select set_config('rcsca.points_member',gen_random_uuid()::text,true);
select set_config('rcsca.points_admin',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data)
select current_setting(k)::uuid,current_setting(k)||'@example.invalid','{}'::jsonb from unnest(array['rcsca.points_member','rcsca.points_admin']) k;
insert into public.memberships(user_id,membership_type,status) values(current_setting('rcsca.points_member')::uuid,'annual','active');
insert into public.admin_roles(user_id,role_key) values(current_setting('rcsca.points_admin')::uuid,'admin');
insert into public.point_transactions(user_id,tx_type,points,source_type,created_at) values
 (current_setting('rcsca.points_member')::uuid,'adjust',100,'anniversary_test','2026-01-01T00:00:00Z'),
 (current_setting('rcsca.points_member')::uuid,'spend',-20,'anniversary_test','2027-03-14T10:00:00Z'),
 (current_setting('rcsca.points_member')::uuid,'adjust',30,'anniversary_test','2028-03-14T16:00:00Z');
update private.points_policy set effective_at='2026-10-15T16:00:00Z';
do $$ declare w jsonb; begin
 w:=private.member_points_wallet(current_setting('rcsca.points_member')::uuid,'2027-03-15T00:00:00Z');
 if w->>'status'<>'admission_pending' or w->>'balance'<>'80' or w->>'expires_at' is not null then raise exception 'unconfirmed_date_invented: %',w;end if;
end $$;
insert into private.membership_register(user_id,membership_year,membership_type,full_name,member_since,confirmed_by)
 values(current_setting('rcsca.points_member')::uuid,2027,'annual','Synthetic points member','2027-03-15',current_setting('rcsca.points_admin')::uuid);
do $$ declare w jsonb; begin
 w:=private.member_points_wallet(current_setting('rcsca.points_member')::uuid,'2028-03-14T15:59:59Z');
 if w->>'balance'<>'80' or w->>'expires_on'<>'2028-03-14' or w->>'days_left'<>'1' then raise exception 'first_period_or_premember_points_failed: %',w;end if;
 w:=private.member_points_wallet(current_setting('rcsca.points_member')::uuid,'2028-03-14T16:00:00Z');
 if w->>'balance'<>'30' or w->>'cycle_start'<>'2028-03-15' or w->>'expires_on'<>'2029-03-14' then raise exception 'anniversary_boundary_failed: %',w;end if;
 if (select sum(points) from public.point_transactions where user_id=current_setting('rcsca.points_member')::uuid)<>110 then raise exception 'ledger_modified';end if;
end $$;
-- Leap-year anniversary derives from the original Feb 29, not prior clamped date.
update private.membership_register set member_since='2024-02-29' where user_id=current_setting('rcsca.points_member')::uuid;
do $$ declare w jsonb; begin
 w:=private.member_points_wallet(current_setting('rcsca.points_member')::uuid,'2027-02-28T00:00:00Z');
 if w->>'cycle_start'<>'2027-02-28' or w->>'expires_on'<>'2028-02-28' then raise exception 'leap_anchor_failed: %',w;end if;
end $$;
-- Rollout never immediately forfeits historical balances.
update private.membership_register set member_since='2020-03-15' where user_id=current_setting('rcsca.points_member')::uuid;
do $$ declare w jsonb; begin
 w:=private.member_points_wallet(current_setting('rcsca.points_member')::uuid,'2026-10-16T00:00:00Z');
 if w->>'balance'<>'100' or w->>'expires_on'<>'2027-03-14' then raise exception 'rollout_balance_lost: %',w;end if;
end $$;
-- Actual request/approval RPCs must use unexpired balance, not ledger sum.
update private.points_policy set effective_at='2000-01-01T00:00:00Z';
update private.membership_register set member_since=((now() at time zone 'Asia/Taipei')::date-interval '2 years')::date where user_id=current_setting('rcsca.points_member')::uuid;
delete from public.point_transactions where user_id=current_setting('rcsca.points_member')::uuid;
insert into public.point_transactions(user_id,tx_type,points,source_type,created_at) values
 (current_setting('rcsca.points_member')::uuid,'adjust',100,'anniversary_test',now()-interval '2 days'),
 (current_setting('rcsca.points_member')::uuid,'adjust',20,'anniversary_test',now());
insert into public.reward_catalog(category,title,point_cost,stock_total,stock_remaining,status) values('daily','Synthetic anniversary reward',25,2,2,'approved') returning set_config('rcsca.points_reward',id::text,true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.points_member'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 if has_function_privilege('anon','public.point_wallet_self()','execute') then raise exception 'anonymous_wallet_exposed';end if;
 if has_function_privilege('authenticated','private.member_points_wallet(uuid,timestamptz)','execute') then raise exception 'private_wallet_exposed';end if;
 if public.point_wallet_self()->>'balance'<>'20' then raise exception 'self_wallet_incorrect';end if;
 begin perform public.reward_submit_redemption(current_setting('rcsca.points_reward')::uuid);raise exception 'expired_points_redeemed';
 exception when raise_exception then if sqlerrm<>'eligibility_not_met' then raise;end if;end;
end $$;
reset role;
insert into public.point_transactions(user_id,tx_type,points,source_type) values(current_setting('rcsca.points_member')::uuid,'adjust',10,'anniversary_test');
set local role authenticated;
select set_config('rcsca.points_redemption',public.reward_submit_redemption(current_setting('rcsca.points_reward')::uuid)::text,true);
reset role;
update public.reward_redemptions set points_expires_at=now()-interval '1 second' where id=current_setting('rcsca.points_redemption')::uuid;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.points_admin'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 begin perform public.admin_review_reward_redemption(current_setting('rcsca.points_redemption')::uuid,'approved');raise exception 'cross_period_request_approved';
 exception when raise_exception then if sqlerrm<>'redemption_points_expired' then raise;end if;end;
end $$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.points_member'),'role','authenticated')::text,true);
set local role authenticated;
select set_config('rcsca.points_redemption',public.reward_submit_redemption(current_setting('rcsca.points_reward')::uuid)::text,true);
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.points_admin'),'role','authenticated')::text,true);
set local role authenticated;
select public.admin_review_reward_redemption(current_setting('rcsca.points_redemption')::uuid,'approved');
reset role;
do $$ begin
 if private.member_points_wallet(current_setting('rcsca.points_member')::uuid)->>'balance'<>'5' then raise exception 'approved_balance_incorrect';end if;
 if exists(select 1 from public.xp_transactions where user_id=current_setting('rcsca.points_member')::uuid) then raise exception 'points_changed_xp';end if;
end $$;
rollback;
