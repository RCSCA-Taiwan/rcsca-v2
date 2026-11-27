begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(5);
insert into auth.users(id) values ('f1000000-0000-4000-8000-000000000003');
insert into public.group_buy_proposals_v2(id,proposer_user_id,title,retail_price,group_price,quantity_limit,fulfillment_terms,return_terms,status)
values ('f2000000-0000-4000-8000-000000000003','f1000000-0000-4000-8000-000000000003','Refund fixture',100,80,50,'fixture','fixture','open');
insert into public.group_buy_v2_orders(id,proposal_id,buyer_id,request_id,quantity,unit_price,shipping_fee,expires_at,status)
values ('f5000000-0000-4000-8000-000000000003','f2000000-0000-4000-8000-000000000003','f1000000-0000-4000-8000-000000000003','f3000000-0000-4000-8000-000000000006',1,80,20,now()+interval '1 hour','paid');
select lives_ok($q$select public.group_buy_v2_request_refund('f5000000-0000-4000-8000-000000000003','f6000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000003',60,10,'fixture')$q$,'partial refund reserved');
select is(public.group_buy_v2_request_refund('f5000000-0000-4000-8000-000000000003','f6000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000003',60,10,'fixture'),(select id from public.group_buy_v2_refunds where request_id='f6000000-0000-4000-8000-000000000001'),'retry returns original refund');
select throws_ok($q$select public.group_buy_v2_request_refund('f5000000-0000-4000-8000-000000000003','f6000000-0000-4000-8000-000000000002','f1000000-0000-4000-8000-000000000003',21,0,'fixture')$q$,'P0001','Refund exceeds receipts','product refund capped');
select throws_ok($q$select public.group_buy_v2_request_refund('f5000000-0000-4000-8000-000000000003','f6000000-0000-4000-8000-000000000002','f1000000-0000-4000-8000-000000000003',0,11,'fixture')$q$,'P0001','Refund exceeds receipts','shipping refund capped');
select ok(public.group_buy_v2_has_settlement_hold('f2000000-0000-4000-8000-000000000003'),'pending refund blocks settlement');
select * from finish();
rollback;
