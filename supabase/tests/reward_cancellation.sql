-- All synthetic users, orders, contact details and ledger entries roll back.
begin;
select set_config('rcsca.cm',gen_random_uuid()::text,true),set_config('rcsca.co',gen_random_uuid()::text,true),set_config('rcsca.ca',gen_random_uuid()::text,true),set_config('rcsca.cp',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data) select current_setting(k)::uuid,current_setting(k)||'@example.invalid','{}'::jsonb from unnest(array['rcsca.cm','rcsca.co','rcsca.ca','rcsca.cp']) k;
insert into public.admin_roles(user_id,role_key) values(current_setting('rcsca.ca')::uuid,'admin');
insert into public.memberships(user_id,membership_type,status) values(current_setting('rcsca.cm')::uuid,'annual','active');
insert into public.point_transactions(user_id,tx_type,points,source_type) values(current_setting('rcsca.cm')::uuid,'adjust',200,'cancellation_test');
insert into public.reward_catalog(title,category,point_cost,stock_total,stock_remaining,status) values('Synthetic cancellation code','daily',40,3,3,'approved') returning set_config('rcsca.cr',id::text,true);
insert into public.reward_catalog(title,category,point_cost,stock_total,stock_remaining,status,fulfillment_type,provider_user_id,shipping_policy,shipping_note) values('Synthetic cancellation delivery','daily',30,3,3,'approved','delivery',current_setting('rcsca.cp')::uuid,'free','Synthetic terms') returning set_config('rcsca.cd',id::text,true);
insert into public.reward_catalog(title,category,point_cost,stock_total,stock_remaining,status,fulfillment_type,provider_user_id) values('Synthetic cancellation service','daily',20,3,3,'approved','service',current_setting('rcsca.cp')::uuid) returning set_config('rcsca.cs',id::text,true);
insert into private.reward_slots(reward_id,starts_at,ends_at,capacity) values(current_setting('rcsca.cs')::uuid,now()+interval '2 days',now()+interval '2 days 1 hour',1) returning set_config('rcsca.cslot',id::text,true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.cm'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 if has_table_privilege('authenticated','private.reward_cancellations','select') or has_table_privilege('authenticated','private.reward_cancellations','update') then raise exception 'cancellation_table_exposed';end if;
 if has_function_privilege('anon','public.reward_cancellation_action(uuid,text,text)','execute') or has_function_privilege('anon','private.reward_cancellation_action(uuid,text,text)','execute') then raise exception 'anonymous_cancellation_exposed';end if;
end $$;
select set_config('rcsca.cb',public.reward_submit_redemption(current_setting('rcsca.cr')::uuid)::text,true);
select set_config('rcsca.cdb',public.reward_submit_fulfillment(current_setting('rcsca.cd')::uuid,null,'{"contact_name":"Synthetic","phone":"0900000000","destination_type":"home","postal_code":"100","address":"Synthetic only"}',true)::text,true);
select set_config('rcsca.csb',public.reward_submit_fulfillment(current_setting('rcsca.cs')::uuid,current_setting('rcsca.cslot')::uuid,'{"contact_name":"Synthetic","phone":"0900000000"}',true)::text,true);
do $$ begin
 begin perform public.reward_cancellation_action(current_setting('rcsca.cb')::uuid,'submit','Not approved');raise exception 'submitted_order_cancelled';exception when raise_exception then if sqlerrm<>'cancellation_requires_approved' then raise;end if;end;
end $$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.ca'),'role','authenticated')::text,true);
set local role authenticated;
select public.admin_review_reward_redemption(current_setting('rcsca.cb')::uuid,'approved');
select public.admin_review_reward_redemption(current_setting('rcsca.cdb')::uuid,'approved');
select public.admin_review_reward_redemption(current_setting('rcsca.csb')::uuid,'approved');
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.co'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 if public.reward_cancellation_list(false)<>'[]'::jsonb or public.reward_cancellation_list(true)<>'[]'::jsonb then raise exception 'foreign_cancellation_leaked';end if;
 begin perform public.reward_cancellation_action(current_setting('rcsca.cb')::uuid,'submit','Foreign request');raise exception 'foreign_request_accepted';exception when raise_exception then if sqlerrm<>'cancellation_access_denied' then raise;end if;end;
end $$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.cm'),'role','authenticated')::text,true);
set local role authenticated;
select public.reward_cancellation_action(current_setting('rcsca.cb')::uuid,'submit','Synthetic code cancellation');
select public.reward_cancellation_action(current_setting('rcsca.cdb')::uuid,'submit','Synthetic delivery cancellation');
select public.reward_cancellation_action(current_setting('rcsca.csb')::uuid,'submit','Synthetic service cancellation');
do $$ begin
 if public.point_wallet_self()->>'balance'<>'110' then raise exception 'submission_refunded_before_review';end if;
 begin perform public.reward_cancellation_action(current_setting('rcsca.cb')::uuid,'submit','Duplicate');raise exception 'duplicate_pending_accepted';exception when raise_exception then if sqlerrm<>'cancellation_already_pending' then raise;end if;end;
end $$;
reset role;
-- Even an admin cannot review their own request.
insert into public.admin_roles(user_id,role_key) values(current_setting('rcsca.cm')::uuid,'admin');
set local role authenticated;
do $$ begin
 begin perform public.reward_cancellation_action(current_setting('rcsca.cb')::uuid,'approve','Self review');raise exception 'self_refund_accepted';exception when raise_exception then if sqlerrm<>'independent_admin_required' then raise;end if;end;
end $$;
reset role;
delete from public.admin_roles where user_id=current_setting('rcsca.cm')::uuid;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.cp'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 if jsonb_array_length(public.reward_cancellation_list(true))<>2 then raise exception 'provider_queue_incorrect';end if;
 begin perform public.reward_fulfillment_action(current_setting('rcsca.cdb')::uuid,'ship','',null,'Synthetic','TEST');raise exception 'shipping_during_cancellation';exception when raise_exception then if sqlerrm<>'cancellation_review_pending' then raise;end if;end;
 begin perform public.reward_cancellation_action(current_setting('rcsca.cdb')::uuid,'approve','Provider refund');raise exception 'provider_refund_accepted';exception when raise_exception then if sqlerrm<>'cancellation_access_denied' then raise;end if;end;
end $$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.ca'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 begin perform public.admin_review_reward_redemption(current_setting('rcsca.cb')::uuid,'completed');raise exception 'code_completed_during_cancellation';exception when raise_exception then if sqlerrm<>'cancellation_review_pending' then raise;end if;end;
end $$;
select public.reward_cancellation_action(current_setting('rcsca.cb')::uuid,'reject','Synthetic rejection');
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.cm'),'role','authenticated')::text,true);
set local role authenticated;
select public.reward_cancellation_action(current_setting('rcsca.cb')::uuid,'submit','Resubmitted code');
select public.reward_cancellation_action(current_setting('rcsca.cb')::uuid,'withdraw');
select public.reward_cancellation_action(current_setting('rcsca.cb')::uuid,'submit','Final code request');
reset role;
-- Simulate original points expiring during review; the credit must not become spendable.
update private.reward_cancellations set points_expires_at=now()-interval '1 second' where redemption_id=current_setting('rcsca.cdb')::uuid;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.ca'),'role','authenticated')::text,true);
set local role authenticated;
select public.reward_cancellation_action(current_setting('rcsca.cb')::uuid,'approve','Verified unused code');
select public.reward_cancellation_action(current_setting('rcsca.cdb')::uuid,'approve','Verified not dispatched');
select public.reward_cancellation_action(current_setting('rcsca.csb')::uuid,'approve','Verified future service');
do $$ begin
 begin perform public.reward_cancellation_action(current_setting('rcsca.cb')::uuid,'approve','Duplicate approval');raise exception 'duplicate_refund_accepted';exception when raise_exception then if sqlerrm<>'cancellation_requires_approved' then raise;end if;end;
 begin perform public.admin_review_reward_redemption(current_setting('rcsca.cb')::uuid,'completed');raise exception 'cancelled_code_completed';exception when raise_exception then if sqlerrm<>'invalid_status_transition' then raise;end if;end;
end $$;
reset role;
do $$ begin
 if private.member_points_wallet(current_setting('rcsca.cm')::uuid)->>'balance'<>'170' then raise exception 'refund_or_expiry_wallet_incorrect';end if;
 if (select count(*) from public.point_transactions where user_id=current_setting('rcsca.cm')::uuid and source_type='reward_refund')<>3 then raise exception 'refund_ledger_incorrect';end if;
 if exists(select 1 from public.reward_catalog where id in (current_setting('rcsca.cr')::uuid,current_setting('rcsca.cd')::uuid,current_setting('rcsca.cs')::uuid) and stock_remaining<>3) then raise exception 'stock_not_restored_once';end if;
 if private.reward_slot_available(current_setting('rcsca.cslot')::uuid)<>1 then raise exception 'slot_not_released';end if;
 if exists(select 1 from public.reward_redemptions where id in (current_setting('rcsca.cb')::uuid,current_setting('rcsca.cdb')::uuid,current_setting('rcsca.csb')::uuid) and (status<>'cancelled' or redemption_code is not null)) then raise exception 'cancelled_code_still_valid';end if;
 if exists(select 1 from public.xp_transactions where user_id=current_setting('rcsca.cm')::uuid) or exists(select 1 from public.sharing_footprints where user_id=current_setting('rcsca.cm')::uuid) then raise exception 'refund_changed_xp_or_footprints';end if;
end $$;
-- Shipped, started or completed orders cannot enter the pre-fulfillment refund flow.
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.cm'),'role','authenticated')::text,true);
set local role authenticated;
select set_config('rcsca.cdb2',public.reward_submit_fulfillment(current_setting('rcsca.cd')::uuid,null,'{"contact_name":"Synthetic","phone":"0900000000","destination_type":"home","postal_code":"100","address":"Synthetic only"}',true)::text,true);
select set_config('rcsca.csb2',public.reward_submit_fulfillment(current_setting('rcsca.cs')::uuid,current_setting('rcsca.cslot')::uuid,'{"contact_name":"Synthetic","phone":"0900000000"}',true)::text,true);
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.cp'),'role','authenticated')::text,true);
set local role authenticated;
select public.reward_fulfillment_action(current_setting('rcsca.cdb2')::uuid,'confirm');
select public.reward_fulfillment_action(current_setting('rcsca.cdb2')::uuid,'ship','',null,'Synthetic','TEST');
select public.reward_fulfillment_action(current_setting('rcsca.csb2')::uuid,'confirm');
reset role;
update private.reward_slots set starts_at=now()-interval '1 hour' where id=current_setting('rcsca.cslot')::uuid;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.cm'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 begin perform public.reward_cancellation_action(current_setting('rcsca.cdb2')::uuid,'submit','Already shipped');raise exception 'shipped_refund_accepted';exception when raise_exception then if sqlerrm<>'cancellation_requires_unfulfilled' then raise;end if;end;
 begin perform public.reward_cancellation_action(current_setting('rcsca.csb2')::uuid,'submit','Already started');raise exception 'started_refund_accepted';exception when raise_exception then if sqlerrm<>'cancellation_requires_unfulfilled' then raise;end if;end;
end $$;
reset role;
select 'PASS: cancellation permissions, independent review, fulfillment freeze, rejection, withdrawal, one refund/stock release, expired points, slot release and post-fulfillment guards' as result;
rollback;
