begin;
create extension if not exists pgtap with schema extensions;
set local search_path=public,extensions;
select plan(6);
insert into auth.users(id) values ('f1000000-0000-4000-8000-000000000020');
insert into public.group_buy_proposals_v2(id,proposer_user_id,title,retail_price,group_price,quantity_limit,fulfillment_terms,return_terms,status,proposer_category,fee_base_snapshot,fee_per_order_snapshot,required_reward_item_quantity)
values ('f2000000-0000-4000-8000-000000000020','f1000000-0000-4000-8000-000000000020','Individual settlement fixture',100,80,50,'fixture','fixture','closed','individual_member',1000,0,2);
select lives_ok($q$select public.group_buy_v2_create_settlement_draft('f2000000-0000-4000-8000-000000000020')$q$,'empty campaign creates held settlement');
select is((select status from public.group_buy_v2_settlements where proposal_id='f2000000-0000-4000-8000-000000000020'),'held','negative payout held');
select is((select service_fee from public.group_buy_v2_settlements where proposal_id='f2000000-0000-4000-8000-000000000020'),1000::numeric,'individual fee snapshot preserved');
-- Verify generated accounting columns independently of campaign approval.
insert into public.group_buy_v2_settlements(proposal_id,version,status,eligible_order_count,gross_product_receipts,refunded_product_amount,base_fee,per_order_fee)
values ('f2000000-0000-4000-8000-000000000020',2,'void',10,10000,500,2000,20);
select is((select service_fee from public.group_buy_v2_settlements where proposal_id='f2000000-0000-4000-8000-000000000020' and version=2),2200::numeric,'enterprise fee arithmetic');
select is((select net_payout from public.group_buy_v2_settlements where proposal_id='f2000000-0000-4000-8000-000000000020' and version=2),7300::numeric,'refund and fees deducted from payout');
select is((select eligible_order_count from public.group_buy_v2_settlements where proposal_id='f2000000-0000-4000-8000-000000000020' and version=2),10,'effective order count stored');
select * from finish();
rollback;
