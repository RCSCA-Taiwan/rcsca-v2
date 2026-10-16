begin;
select set_config('db.admin',gen_random_uuid()::text,true),set_config('db.a',gen_random_uuid()::text,true),set_config('db.b',gen_random_uuid()::text,true),set_config('db.batch',gen_random_uuid()::text,true),set_config('db.ref',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data) select current_setting(k)::uuid,current_setting(k)||'@example.invalid','{}'::jsonb from unnest(array['db.admin','db.a','db.b']) k;
insert into public.admin_roles(user_id,role_key) values(current_setting('db.admin')::uuid,'admin');
insert into public.memberships(user_id,membership_type,member_since,status) values(current_setting('db.a')::uuid,'annual',current_date,'active');
update public.memberships set member_number='TEST-'||current_setting('db.a') where user_id=current_setting('db.a')::uuid;
update public.profiles set display_name='Synthetic A' where id=current_setting('db.a')::uuid;
select set_config('db.rows',jsonb_build_array(jsonb_build_object('member_number',(select member_number from public.memberships where user_id=current_setting('db.a')::uuid),'email',current_setting('db.a')||'@example.invalid','name','林○○先生','pledged',2000,'amount',1000,'received_on',(now() at time zone 'Asia/Taipei')::date,'reference',current_setting('db.ref'),'note','Synthetic bank verification'))::text,true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('db.b'),'role','authenticated')::text,true);set local role authenticated;
do $$ begin
 begin perform public.admin_donation_import_preview('Synthetic activity',current_setting('db.rows')::jsonb);raise exception 'member_preview_allowed';exception when raise_exception then if sqlerrm<>'admin_required' then raise;end if;end;
 if has_table_privilege('authenticated','private.donation_import_batches','select') or has_function_privilege('anon','public.admin_donation_import_commit(uuid,text,jsonb,text,boolean)','execute') then raise exception 'batch_exposed';end if;
end $$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('db.admin'),'role','authenticated')::text,true);set local role authenticated;
select public.admin_donation_pledge_save(current_setting('db.batch')::uuid,'Synthetic activity',jsonb_build_object('paste','林○○先生認購1單位'));
select set_config('db.preview',public.admin_donation_import_preview('Synthetic activity',current_setting('db.rows')::jsonb)::text,true);
do $$ declare r jsonb;begin
 if current_setting('db.preview')::jsonb->>'ready'<>'1' then raise exception 'valid_pair_not_ready';end if;
 r:=public.admin_donation_import_preview('Synthetic activity',jsonb_build_array((current_setting('db.rows')::jsonb->0)||jsonb_build_object('member_number','','email','','name','Synthetic A先生')));
 if r->>'ready'<>'1' then raise exception 'unique_name_not_matched';end if;
 r:=public.admin_donation_import_preview('Synthetic activity',jsonb_build_array((current_setting('db.rows')::jsonb->0)||jsonb_build_object('member_number','','email','','name','林○○先生')));
 if r->>'ready'<>'0' then raise exception 'masked_name_guessed';end if;
 r:=public.admin_donation_import_preview('Synthetic activity',jsonb_build_array((current_setting('db.rows')::jsonb->0)||jsonb_build_object('email',current_setting('db.b')||'@example.invalid')));
 if r->>'ready'<>'0' then raise exception 'conflicting_identifiers_accepted';end if;
 r:=public.admin_donation_import_preview('Synthetic activity',current_setting('db.rows')::jsonb||current_setting('db.rows')::jsonb);
 if r->>'ready'<>'0' then raise exception 'duplicate_batch_reference_accepted';end if;
 r:=public.admin_donation_import_preview('Synthetic activity',jsonb_build_array((current_setting('db.rows')::jsonb->0)||jsonb_build_object('member_number','','email','not-registered@example.invalid')));
 if r->>'ready'<>'0' then raise exception 'unknown_account_accepted';end if;
 begin perform public.admin_donation_import_commit(current_setting('db.batch')::uuid,'Synthetic activity',current_setting('db.rows')::jsonb,'bad-digest',true);raise exception 'stale_preview_accepted';exception when raise_exception then if sqlerrm<>'preview_changed_review_again' then raise;end if;end;
 begin perform public.admin_donation_import_commit(current_setting('db.batch')::uuid,'Synthetic activity',current_setting('db.rows')::jsonb,current_setting('db.preview')::jsonb->>'digest',false);raise exception 'unverified_commit_accepted';exception when raise_exception then if sqlerrm<>'payment_verification_required' then raise;end if;end;
end $$;
select public.admin_donation_import_commit(current_setting('db.batch')::uuid,'Synthetic activity',current_setting('db.rows')::jsonb,current_setting('db.preview')::jsonb->>'digest',true);
select public.admin_donation_import_commit(current_setting('db.batch')::uuid,'Synthetic activity',current_setting('db.rows')::jsonb,current_setting('db.preview')::jsonb->>'digest',true);
do $$ begin
 if public.admin_donation_import_preview('Synthetic activity',current_setting('db.rows')::jsonb)->>'ready'<>'0' then raise exception 'existing_reference_accepted';end if;
 if jsonb_array_length(public.admin_donation_pledge_list())<>0 then raise exception 'imported_draft_still_pending';end if;
 if public.admin_donation_import_preview('Synthetic activity',jsonb_build_array((current_setting('db.rows')::jsonb->0)||jsonb_build_object('member_number','','email','','reference',gen_random_uuid()::text)))->>'ready'<>'1' then raise exception 'confirmed_activity_alias_not_reused';end if;
 begin perform public.admin_donation_record(current_setting('db.a')||'@example.invalid',1000,current_date,lower(current_setting('db.ref')),'Case-insensitive duplicate',true);raise exception 'legacy_duplicate_accepted';exception when raise_exception then if sqlerrm<>'duplicate_donation_reference' then raise;end if;end;
end $$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('db.a'),'role','authenticated')::text,true);set local role authenticated;
do $$ declare r jsonb:=public.donation_contribution_self();begin
 if r->>'verified_total'<>'1000' or jsonb_array_length(r->'records')<>1 or r->'records'->0->>'activity_name'<>'Synthetic activity' then raise exception 'contribution_total_or_activity_incorrect';end if;
end $$;
reset role;
do $$ begin
 if exists(select 1 from public.point_transactions where user_id=current_setting('db.a')::uuid) or exists(select 1 from public.xp_transactions where user_id=current_setting('db.a')::uuid) then raise exception 'donation_awarded_points_or_xp';end if;
 if (select count(*) from private.donation_records where import_batch=current_setting('db.batch')::uuid)<>1 then raise exception 'retry_duplicated_records';end if;
end $$;
rollback;
