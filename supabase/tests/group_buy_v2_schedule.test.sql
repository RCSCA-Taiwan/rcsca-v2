begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(6);
insert into auth.users(id) values ('f1000000-0000-4000-8000-000000000030');
insert into public.group_buy_proposals_v2(id,proposer_user_id,title,retail_price,group_price,quantity_limit,fulfillment_terms,return_terms,status,proposer_category,fee_base_snapshot,fee_per_order_snapshot,required_reward_item_quantity)
select ('f2000000-0000-4000-8000-00000000003'||n)::uuid,'f1000000-0000-4000-8000-000000000030','Schedule fixture',100,80,50,'fixture','fixture','approved','individual_member',1000,0,2 from generate_series(1,4) n;
select throws_ok($q$select public.group_buy_v2_schedule('f2000000-0000-4000-8000-000000000031','2099-01-05')$q$,'P0001','Reward contributions not verified','unverified contribution blocks scheduling');
insert into public.group_buy_v2_reward_contributions(proposal_id,item_title,quantity,received_quantity,verified_quantity,review_status,verified_by,verified_at)
select id,'Fixture reward',2,2,2,'verified','f1000000-0000-4000-8000-000000000030',now() from public.group_buy_proposals_v2 where proposer_user_id='f1000000-0000-4000-8000-000000000030';
select is(public.group_buy_v2_schedule('f2000000-0000-4000-8000-000000000031','2099-01-05'),1::smallint,'first slot');
select is(public.group_buy_v2_schedule('f2000000-0000-4000-8000-000000000031','2099-01-05'),1::smallint,'retry retains slot');
select is(public.group_buy_v2_schedule('f2000000-0000-4000-8000-000000000032','2099-01-05'),2::smallint,'second slot');
select is(public.group_buy_v2_schedule('f2000000-0000-4000-8000-000000000033','2099-01-05'),3::smallint,'third slot');
select throws_ok($q$select public.group_buy_v2_schedule('f2000000-0000-4000-8000-000000000034','2099-01-05')$q$,'P0001','Weekly capacity exhausted','fourth campaign denied');
select * from finish();
rollback;
