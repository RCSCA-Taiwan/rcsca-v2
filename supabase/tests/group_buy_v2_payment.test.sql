begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(6);
insert into auth.users(id) values ('f1000000-0000-4000-8000-000000000002');
insert into public.group_buy_proposals_v2(id,proposer_user_id,title,retail_price,group_price,quantity_limit,fulfillment_terms,return_terms,scheduled_week,weekly_slot,status)
values ('f2000000-0000-4000-8000-000000000002','f1000000-0000-4000-8000-000000000002','Payment fixture',100,80,50,'fixture','fixture','2099-01-05',1,'open');
insert into public.group_buy_v2_orders(id,proposal_id,buyer_id,request_id,quantity,unit_price,shipping_fee,expires_at)
values ('f5000000-0000-4000-8000-000000000001','f2000000-0000-4000-8000-000000000002','f1000000-0000-4000-8000-000000000002','f3000000-0000-4000-8000-000000000003',49,80,0,now()-interval '1 hour'),
('f5000000-0000-4000-8000-000000000002','f2000000-0000-4000-8000-000000000002','f1000000-0000-4000-8000-000000000002','f3000000-0000-4000-8000-000000000004',1,80,20,now()+interval '1 hour');
select throws_ok($q$select public.group_buy_v2_transition('f5000000-0000-4000-8000-000000000001','f4000000-0000-4000-8000-000000000002','f1000000-0000-4000-8000-000000000002','bank_verified',3920,'fixture-expired')$q$,'P0001','Invalid payment verification','expired payment rejected');
select throws_ok($q$select public.group_buy_v2_transition('f5000000-0000-4000-8000-000000000002','f4000000-0000-4000-8000-000000000003','f1000000-0000-4000-8000-000000000002','bank_verified',80,'fixture-paid')$q$,'P0001','Invalid payment verification','shipping included in amount');
select is(public.group_buy_v2_transition('f5000000-0000-4000-8000-000000000002','f4000000-0000-4000-8000-000000000003','f1000000-0000-4000-8000-000000000002','bank_verified',100,'fixture-paid'),'paid','exact amount accepted');
select is(public.group_buy_v2_transition('f5000000-0000-4000-8000-000000000002','f4000000-0000-4000-8000-000000000003','f1000000-0000-4000-8000-000000000002','bank_verified',100,'fixture-paid'),'paid','payment retry idempotent');
select lives_ok($q$select public.group_buy_v2_reserve('f2000000-0000-4000-8000-000000000002','f1000000-0000-4000-8000-000000000002','f3000000-0000-4000-8000-000000000005',49,0,now()+interval '1 hour')$q$,'expired capacity reclaimed');
select is((select status from public.group_buy_v2_orders where id='f5000000-0000-4000-8000-000000000001'),'expired','expired order marked');
select * from finish();
rollback;
