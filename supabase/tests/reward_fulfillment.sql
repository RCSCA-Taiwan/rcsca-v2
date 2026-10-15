-- All accounts, contact data, reservations and ledger changes roll back.
begin;
select set_config('rcsca.fm',gen_random_uuid()::text,true),set_config('rcsca.fo',gen_random_uuid()::text,true),set_config('rcsca.fp',gen_random_uuid()::text,true),set_config('rcsca.fa',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data) select current_setting(k)::uuid,current_setting(k)||'@example.invalid','{}'::jsonb from unnest(array['rcsca.fm','rcsca.fo','rcsca.fp','rcsca.fa']) k;
insert into public.admin_roles(user_id,role_key) values(current_setting('rcsca.fa')::uuid,'admin');
insert into public.memberships(user_id,membership_type,status) values(current_setting('rcsca.fm')::uuid,'annual','active'),(current_setting('rcsca.fo')::uuid,'annual','active');
insert into public.point_transactions(user_id,tx_type,points,source_type) values(current_setting('rcsca.fm')::uuid,'adjust',100,'fulfillment_test'),(current_setting('rcsca.fo')::uuid,'adjust',100,'fulfillment_test');
insert into public.reward_catalog(title,category,point_cost,stock_total,stock_remaining,status,fulfillment_type,provider_user_id) values('Synthetic service','daily',40,5,5,'approved','service',current_setting('rcsca.fp')::uuid) returning set_config('rcsca.fr',id::text,true);
insert into public.reward_catalog(title,category,point_cost,stock_total,stock_remaining,status) values('Synthetic code','daily',70,5,5,'approved') returning set_config('rcsca.fc',id::text,true);
insert into public.reward_catalog(title,category,point_cost,stock_total,stock_remaining,status,fulfillment_type,provider_user_id,shipping_policy,shipping_note) values('Synthetic delivery','daily',30,5,5,'approved','delivery',current_setting('rcsca.fp')::uuid,'recipient_pays','Synthetic delivery terms') returning set_config('rcsca.fd',id::text,true);
insert into private.reward_slots(reward_id,starts_at,ends_at,capacity) values(current_setting('rcsca.fr')::uuid,now()+interval '3 days',now()+interval '3 days 1 hour',1) returning set_config('rcsca.fs',id::text,true);
insert into private.reward_slots(reward_id,starts_at,ends_at,capacity) values(current_setting('rcsca.fr')::uuid,now()+interval '4 days',now()+interval '4 days 1 hour',1) returning set_config('rcsca.fs2',id::text,true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.fm'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 if has_table_privilege('authenticated','private.reward_fulfillment','select') then raise exception 'private_delivery_details_exposed';end if;
 if has_function_privilege('authenticated','private.settle_reward_redemption(uuid,public.review_status,text)','execute') then raise exception 'private_settlement_exposed';end if;
 begin perform public.reward_submit_redemption(current_setting('rcsca.fr')::uuid);raise exception 'booking_details_bypassed';exception when raise_exception then if sqlerrm<>'fulfillment_details_required' then raise;end if;end;
 begin perform public.reward_submit_fulfillment(current_setting('rcsca.fr')::uuid,current_setting('rcsca.fs')::uuid,'{"contact_name":"Synthetic","phone":"0900000000"}',false);raise exception 'contact_consent_bypassed';exception when raise_exception then if sqlerrm<>'contact_consent_required' then raise;end if;end;
end $$;
select set_config('rcsca.fb',public.reward_submit_fulfillment(current_setting('rcsca.fr')::uuid,current_setting('rcsca.fs')::uuid,'{"contact_name":"Synthetic","phone":"0900000000"}',true)::text,true);
do $$ declare w jsonb;begin
 w:=public.point_wallet_self();if w->>'balance'<>'60' or w->>'reserved_points'<>'40' or w->>'ledger_balance'<>'100' then raise exception 'reservation_wallet_incorrect: %',w;end if;
 begin perform public.reward_submit_redemption(current_setting('rcsca.fc')::uuid);raise exception 'reserved_points_double_spent';exception when raise_exception then if sqlerrm<>'eligibility_not_met' then raise;end if;end;
end $$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.fo'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 if public.reward_fulfillment_list(false)<>'[]'::jsonb or public.reward_fulfillment_list(true)<>'[]'::jsonb then raise exception 'foreign_order_exposed';end if;
 begin perform public.reward_submit_fulfillment(current_setting('rcsca.fr')::uuid,current_setting('rcsca.fs')::uuid,'{"contact_name":"Other","phone":"0900000000"}',true);raise exception 'slot_overbooked';exception when raise_exception then if sqlerrm<>'slot_full' then raise;end if;end;
 begin perform public.reward_fulfillment_action(current_setting('rcsca.fb')::uuid,'confirm');raise exception 'foreign_order_confirmed';exception when raise_exception then if sqlerrm<>'fulfillment_access_denied' then raise;end if;end;
end $$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.fp'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 if jsonb_array_length(public.reward_fulfillment_list(true))<>1 then raise exception 'provider_missing_owned_order';end if;
end $$;
select public.reward_fulfillment_action(current_setting('rcsca.fb')::uuid,'propose_time','Synthetic alternate time',current_setting('rcsca.fs2')::uuid);
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.fa'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 begin perform public.admin_review_reward_redemption(current_setting('rcsca.fb')::uuid,'approved');raise exception 'member_time_consent_bypassed';exception when raise_exception then if sqlerrm<>'alternative_time_requires_member_confirmation' then raise;end if;end;
end $$;
reset role;
do $$ begin
 if private.reward_slot_available(current_setting('rcsca.fs')::uuid)<>1 or private.reward_slot_available(current_setting('rcsca.fs2')::uuid)<>0 then raise exception 'proposal_slot_capacity_incorrect';end if;
end $$;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.fm'),'role','authenticated')::text,true);
set local role authenticated;
select public.reward_fulfillment_action(current_setting('rcsca.fb')::uuid,'accept_time');
do $$ begin
 if public.point_wallet_self()->>'balance'<>'60' or public.point_wallet_self()->>'reserved_points'<>'0' then raise exception 'confirmation_double_deducted';end if;
end $$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.fp'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 begin perform public.reward_fulfillment_action(current_setting('rcsca.fb')::uuid,'confirm');raise exception 'duplicate_confirmation_accepted';exception when raise_exception then if sqlerrm<>'invalid_fulfillment_transition' then raise;end if;end;
 begin perform public.reward_fulfillment_action(current_setting('rcsca.fb')::uuid,'service_delivered');raise exception 'future_service_marked_delivered';exception when raise_exception then if sqlerrm<>'service_not_started' then raise;end if;end;
end $$;
reset role;
update private.reward_slots set starts_at=now()-interval '1 hour',ends_at=now()+interval '1 hour' where id=current_setting('rcsca.fs2')::uuid;
set local role authenticated;
select public.reward_fulfillment_action(current_setting('rcsca.fb')::uuid,'service_delivered');
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.fm'),'role','authenticated')::text,true);
set local role authenticated;
select public.reward_fulfillment_action(current_setting('rcsca.fb')::uuid,'received');
do $$ begin
 begin perform public.reward_submit_fulfillment(current_setting('rcsca.fd')::uuid,null,'{"contact_name":"Synthetic","phone":"0900000000"}',true);raise exception 'missing_address_accepted';exception when raise_exception then if sqlerrm<>'delivery_address_required' then raise;end if;end;
end $$;
select set_config('rcsca.fdb',public.reward_submit_fulfillment(current_setting('rcsca.fd')::uuid,null,'{"contact_name":"Synthetic","phone":"0900000000","destination_type":"home","postal_code":"100","address":"Synthetic private address"}',true)::text,true);
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.fp'),'role','authenticated')::text,true);
set local role authenticated;
select public.reward_fulfillment_action(current_setting('rcsca.fdb')::uuid,'confirm');
select public.reward_fulfillment_action(current_setting('rcsca.fdb')::uuid,'ship','Synthetic shipping',null,'Synthetic carrier','TEST-ONLY-123');
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.fm'),'role','authenticated')::text,true);
set local role authenticated;
select public.reward_fulfillment_action(current_setting('rcsca.fdb')::uuid,'report_issue','Synthetic delivery question');
select public.reward_fulfillment_action(current_setting('rcsca.fdb')::uuid,'received');
reset role;
do $$ begin
 if private.member_points_wallet(current_setting('rcsca.fm')::uuid)->>'balance'<>'30' then raise exception 'delivery_balance_incorrect';end if;
 if (select count(*) from public.point_transactions where user_id=current_setting('rcsca.fm')::uuid and tx_type='spend')<>2 then raise exception 'duplicate_spend';end if;
 if exists(select 1 from public.xp_transactions where user_id=current_setting('rcsca.fm')::uuid) then raise exception 'fulfillment_changed_xp';end if;
end $$;
-- Expiration releases points and capacity without requiring a background job.
insert into public.point_transactions(user_id,tx_type,points,source_type) values(current_setting('rcsca.fm')::uuid,'adjust',80,'fulfillment_test');
set local role authenticated;
select set_config('rcsca.fexpired',public.reward_submit_fulfillment(current_setting('rcsca.fr')::uuid,current_setting('rcsca.fs')::uuid,'{"contact_name":"Synthetic","phone":"0900000000"}',true)::text,true);
reset role;
update private.reward_fulfillment set hold_until=now()-interval '1 second' where redemption_id=current_setting('rcsca.fexpired')::uuid;
update public.reward_redemptions set reservation_until=now()-interval '1 second' where id=current_setting('rcsca.fexpired')::uuid;
do $$ begin
 if private.member_points_wallet(current_setting('rcsca.fm')::uuid)->>'balance'<>'110' or private.reward_slot_available(current_setting('rcsca.fs')::uuid)<>1 then raise exception 'expired_hold_not_released';end if;
end $$;
set local role authenticated;
select public.reward_fulfillment_action(current_setting('rcsca.fexpired')::uuid,'cancel');
rollback;
