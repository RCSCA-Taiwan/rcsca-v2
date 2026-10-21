-- No fixture or balance change survives this transaction.
-- Historical filename retained so the canonical workflow list remains stable;
-- policy is now calendar-year (Jan 1-Dec 31 Asia/Taipei), not anniversary-based.
begin;
select set_config('rcsca.points_member',gen_random_uuid()::text,true);
select set_config('rcsca.points_admin',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data)
select current_setting(k)::uuid,current_setting(k)||'@example.invalid','{}'::jsonb
from unnest(array['rcsca.points_member','rcsca.points_admin']) k;
insert into public.memberships(user_id,membership_type,status)
values(current_setting('rcsca.points_member')::uuid,'annual','active');
insert into public.admin_roles(user_id,role_key)
values(current_setting('rcsca.points_admin')::uuid,'admin');
insert into private.membership_register(user_id,membership_year,membership_type,full_name,member_since,confirmed_by)
values(current_setting('rcsca.points_member')::uuid,2026,'annual','Synthetic points member','2024-02-29',current_setting('rcsca.points_admin')::uuid);

-- Calendar boundary is independent of admission anniversary, including leap-day members.
insert into public.point_transactions(user_id,tx_type,points,source_type,created_at) values
 (current_setting('rcsca.points_member')::uuid,'adjust',100,'calendar_year_test','2026-12-31 23:00:00+08'),
 (current_setting('rcsca.points_member')::uuid,'adjust',30,'calendar_year_test','2027-01-01 00:30:00+08');
do $$ declare w jsonb; begin
 w:=private.member_points_wallet(current_setting('rcsca.points_member')::uuid,'2026-12-31 23:30:00+08');
 if w->>'status'<>'active_cycle' or w->>'balance'<>'100' or w->>'cycle_start'<>'2026-01-01' or w->>'expires_on'<>'2026-12-31' or w->>'member_since'<>'2024-02-29' then
   raise exception 'calendar_2026_wallet_failed: %',w;
 end if;
 w:=private.member_points_wallet(current_setting('rcsca.points_member')::uuid,'2027-01-01 00:45:00+08');
 if w->>'balance'<>'30' or w->>'cycle_start'<>'2027-01-01' or w->>'expires_on'<>'2027-12-31' then
   raise exception 'calendar_year_boundary_failed: %',w;
 end if;
 if (select sum(points) from public.point_transactions where user_id=current_setting('rcsca.points_member')::uuid)<>130 then raise exception 'ledger_modified';end if;
end $$;

-- Actual request/approval RPCs use only the live calendar-year wallet.
delete from public.point_transactions where user_id=current_setting('rcsca.points_member')::uuid;
insert into public.point_transactions(user_id,tx_type,points,source_type,created_at)
values(current_setting('rcsca.points_member')::uuid,'adjust',20,'calendar_year_test',now()-interval '1 hour');
insert into public.reward_catalog(category,title,point_cost,stock_total,stock_remaining,status)
values('daily','Synthetic annual reward',25,2,2,'approved')
returning set_config('rcsca.points_reward',id::text,true);

select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.points_member'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 if has_function_privilege('anon','public.point_wallet_self()','execute') then raise exception 'anonymous_wallet_exposed';end if;
 if has_function_privilege('authenticated','private.member_points_wallet(uuid,timestamptz)','execute') then raise exception 'private_wallet_exposed';end if;
 if public.point_wallet_self()->>'balance'<>'20' then raise exception 'self_wallet_incorrect';end if;
 if public.point_wallet_self()->>'expires_on'<>to_char(make_date(extract(year from (now() at time zone 'Asia/Taipei'))::integer,12,31),'YYYY-MM-DD') then raise exception 'self_wallet_not_calendar_year';end if;
 begin perform public.reward_submit_redemption(current_setting('rcsca.points_reward')::uuid);raise exception 'insufficient_points_redeemed';
 exception when raise_exception then if sqlerrm<>'eligibility_not_met' then raise;end if;end;
end $$;
reset role;

insert into public.point_transactions(user_id,tx_type,points,source_type)
values(current_setting('rcsca.points_member')::uuid,'adjust',10,'calendar_year_test');
set local role authenticated;
select set_config('rcsca.points_redemption',public.reward_submit_redemption(current_setting('rcsca.points_reward')::uuid)::text,true);
reset role;
update public.reward_redemptions set points_expires_at=now()-interval '1 second' where id=current_setting('rcsca.points_redemption')::uuid;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.points_admin'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 begin perform public.admin_review_reward_redemption(current_setting('rcsca.points_redemption')::uuid,'approved');raise exception 'expired_request_approved';
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
