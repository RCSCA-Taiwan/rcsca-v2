begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(15);
insert into auth.users(id) values ('f1000000-0000-4000-8000-000000000020');
insert into public.group_buy_proposals_v2(id,proposer_user_id,title,retail_price,group_price,quantity_limit,fulfillment_terms,return_terms,scheduled_week,weekly_slot,status,proposer_category,fee_base_snapshot,fee_per_order_snapshot,required_reward_item_quantity)
values ('f2000000-0000-4000-8000-000000000020','f1000000-0000-4000-8000-000000000020','Individual settlement fixture',100,80,50,'fixture','fixture','2099-01-05',1,'closed','individual_member',1000,0,2);
select lives_ok($q$select public.group_buy_v2_create_settlement_draft('f2000000-0000-4000-8000-000000000020')$q$,'empty campaign creates held settlement');
select is((select status from public.group_buy_v2_settlements where proposal_id='f2000000-0000-4000-8000-000000000020'),'held','negative payout held');
select is((select service_fee from public.group_buy_v2_settlements where proposal_id='f2000000-0000-4000-8000-000000000020'),1000::numeric,'individual fee snapshot preserved');
-- Verify generated accounting columns independently of campaign approval.
insert into public.group_buy_v2_settlements(proposal_id,version,status,eligible_order_count,gross_product_receipts,refunded_product_amount,base_fee,per_order_fee)
values ('f2000000-0000-4000-8000-000000000020',2,'void',10,10000,500,2000,20);
select is((select service_fee from public.group_buy_v2_settlements where proposal_id='f2000000-0000-4000-8000-000000000020' and version=2),2200::numeric,'enterprise fee arithmetic');
select is((select net_payout from public.group_buy_v2_settlements where proposal_id='f2000000-0000-4000-8000-000000000020' and version=2),7300::numeric,'refund and fees deducted from payout');
select is((select eligible_order_count from public.group_buy_v2_settlements where proposal_id='f2000000-0000-4000-8000-000000000020' and version=2),10,'effective order count stored');
update public.group_buy_v2_settlements set status='void' where proposal_id='f2000000-0000-4000-8000-000000000020';
insert into public.group_buy_v2_orders(proposal_id,buyer_id,request_id,quantity,unit_price,shipping_fee,expires_at,status,paid_at,verified_by,payment_reference,delivered_at,dispute_window_closed_at)
values ('f2000000-0000-4000-8000-000000000020','f1000000-0000-4000-8000-000000000020','f3000000-0000-4000-8000-000000000020',20,80,0,now()-interval '3 days','delivered',now()-interval '4 days','f1000000-0000-4000-8000-000000000020','settlement-fixture-20',now()-interval '2 days',now()-interval '1 day');
insert into public.group_buy_v2_orders(proposal_id,buyer_id,request_id,quantity,unit_price,shipping_fee,expires_at,status)
values ('f2000000-0000-4000-8000-000000000020','f1000000-0000-4000-8000-000000000020','f3000000-0000-4000-8000-000000000021',10,80,0,now()-interval '3 days','cancelled');
select lives_ok($q$select public.group_buy_v2_create_settlement_draft('f2000000-0000-4000-8000-000000000020')$q$,'settlement generated from orders');
select is((select eligible_order_count from public.group_buy_v2_settlements where proposal_id='f2000000-0000-4000-8000-000000000020' and status='draft'),1,'cancelled order excluded');
select is((select net_payout from public.group_buy_v2_settlements where proposal_id='f2000000-0000-4000-8000-000000000020' and status='draft'),600::numeric,'individual payout derived from delivered order');
select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000020',true);
select throws_ok($q$select public.group_buy_v2_approve_settlement((select id from public.group_buy_v2_settlements where proposal_id='f2000000-0000-4000-8000-000000000020' and status='draft'))$q$,'P0001','Forbidden','nonstaff approval denied');
insert into public.group_buy_v2_staff_permissions(user_id,permission) values ('f1000000-0000-4000-8000-000000000020','approve_settlement');
select lives_ok($q$select public.group_buy_v2_approve_settlement((select id from public.group_buy_v2_settlements where proposal_id='f2000000-0000-4000-8000-000000000020' and status='draft'))$q$,'authorized approval');
select throws_ok($q$select public.group_buy_v2_confirm_payout((select id from public.group_buy_v2_settlements where proposal_id='f2000000-0000-4000-8000-000000000020' and status='approved'),601,'payout-fixture-20')$q$,'P0001','Payout not eligible','incorrect payout denied');
select lives_ok($q$select public.group_buy_v2_confirm_payout((select id from public.group_buy_v2_settlements where proposal_id='f2000000-0000-4000-8000-000000000020' and status='approved'),600,'payout-fixture-20')$q$,'exact payout confirmed');
select lives_ok($q$select public.group_buy_v2_confirm_payout((select id from public.group_buy_v2_settlements where proposal_id='f2000000-0000-4000-8000-000000000020' and status='paid'),600,'payout-fixture-20')$q$,'payout retry idempotent');
select is((select count(*) from public.group_buy_v2_settlements where payout_reference='payout-fixture-20' and status='paid'),1::bigint,'single paid settlement');
select * from finish();
rollback;
