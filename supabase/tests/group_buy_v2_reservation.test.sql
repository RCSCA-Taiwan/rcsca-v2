begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(6);
insert into auth.users(id) values ('f1000000-0000-4000-8000-000000000001');
insert into public.group_buy_proposals_v2(id,proposer_user_id,title,retail_price,group_price,quantity_limit,fulfillment_terms,return_terms,status)
values ('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001','Regression fixture',100,80,50,'fixture','fixture','open');
select lives_ok($q$select public.group_buy_v2_reserve('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001','f3000000-0000-4000-8000-000000000001',50,0,now()+interval '1 hour')$q$,'reserve full capacity');
select is(public.group_buy_v2_reserve('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001','f3000000-0000-4000-8000-000000000001',50,0,now()+interval '1 hour'),(select id from public.group_buy_v2_orders where request_id='f3000000-0000-4000-8000-000000000001'),'retry returns original order');
select throws_ok($q$select public.group_buy_v2_reserve('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001','f3000000-0000-4000-8000-000000000002',1,0,now()+interval '1 hour')$q$,'P0001','Insufficient stock','reject excess capacity');
select is((select count(*) from public.group_buy_v2_orders where proposal_id='f2000000-0000-4000-8000-000000000001'),1::bigint,'no duplicate order');
select is(public.group_buy_v2_transition((select id from public.group_buy_v2_orders where request_id='f3000000-0000-4000-8000-000000000001'),'f4000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001','cancel'),'cancelled','buyer cancels reservation');
select lives_ok($q$select public.group_buy_v2_reserve('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001','f3000000-0000-4000-8000-000000000002',50,0,now()+interval '1 hour')$q$,'cancelled stock can be reserved again');
select * from finish();
rollback;
