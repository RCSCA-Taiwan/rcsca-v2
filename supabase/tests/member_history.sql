-- Synthetic accounts, contacts and secrets are rolled back.
begin;
select set_config('rcsca.hadmin',gen_random_uuid()::text,true),set_config('rcsca.huser',gen_random_uuid()::text,true),set_config('rcsca.hother',gen_random_uuid()::text,true),set_config('rcsca.hunverified',gen_random_uuid()::text,true),set_config('rcsca.hbatch',gen_random_uuid()::text,true);
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
select current_setting(k)::uuid,current_setting(k)||'@example.invalid',case when k<>'rcsca.hunverified' then now() end,'{}'::jsonb from unnest(array['rcsca.hadmin','rcsca.huser','rcsca.hother','rcsca.hunverified']) k;
insert into public.admin_roles(user_id,role_key) values(current_setting('rcsca.hadmin')::uuid,'admin');
select set_config('rcsca.hrows',jsonb_build_array(jsonb_build_object('name','Synthetic original','membership_type','lifetime','member_since','2018-03-01','membership_year',extract(year from now() at time zone 'Asia/Taipei')::text,'email',current_setting('rcsca.huser')||'@example.invalid','phone','0900000000','identity','A123456789','birth_date','1990-02-28','referrer_text','Synthetic introducer'))::text,true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('rcsca.huser'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 if has_table_privilege('authenticated','private.member_birthdays','select') or has_table_privilege('authenticated','private.legacy_members','select') or has_table_privilege('authenticated','private.legacy_member_claims','select') or has_function_privilege('anon','public.member_history_self()','execute') then raise exception 'history_exposed';end if;
 begin perform public.admin_legacy_members_import(current_setting('rcsca.hrows')::jsonb,null,'',false,'');raise exception 'nonadmin_import';exception when raise_exception then if sqlerrm<>'admin_required' then raise;end if;end;
 begin perform public.admin_member_birthdays(2);raise exception 'nonadmin_birthdays';exception when raise_exception then if sqlerrm<>'admin_required' then raise;end if;end;
 begin perform public.member_birthday_save((now() at time zone 'Asia/Taipei')::date+1,true);raise exception 'future_birthday';exception when raise_exception then if sqlerrm<>'invalid_birthday' then raise;end if;end;
 perform public.member_birthday_save('1992-02-29',false);
 if public.member_history_self()->>'birth_date'<>'1992-02-29' then raise exception 'birthday_not_saved';end if;
 begin perform public.membership_submit_with_birthday('new','annual','Synthetic','A123456789','0900000000','synthetic@example.invalid','Synthetic address','',false,false,'1991-01-01',true);raise exception 'nonconsensual_application';exception when raise_exception then if sqlerrm<>'consent_required' then raise;end if;end;
 if public.member_history_self()->>'birth_date'<>'1992-02-29' then raise exception 'failed_application_wrote_birthday';end if;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('rcsca.hadmin'),'role','authenticated')::text,true);
set local role authenticated;
select set_config('rcsca.hpreview',public.admin_legacy_members_import(current_setting('rcsca.hrows')::jsonb,null,'',false,'')::text,true);
do $$ declare v jsonb;r jsonb:=current_setting('rcsca.hrows')::jsonb;begin
 if current_setting('rcsca.hpreview')::jsonb->>'ready'<>'1' then raise exception 'valid_legacy_blocked: %',current_setting('rcsca.hpreview');end if;
 v:=public.admin_legacy_members_import(jsonb_set(r,'{0,birth_date}','"2020-02-30"'),null,'',false,'');if v->>'ready'<>'0' then raise exception 'bad_date_allowed';end if;
 v:=public.admin_legacy_members_import(jsonb_build_array(r->0,jsonb_set(r->0,'{name}','"Other synthetic"')),null,'',false,'');if v->>'ready'<>'0' then raise exception 'duplicate_id_allowed';end if;
 begin perform public.admin_legacy_members_import(r,current_setting('rcsca.hbatch')::uuid,'Synthetic source',true,'wrong');raise exception 'stale_preview_allowed';exception when raise_exception then if sqlerrm<>'import_preview_changed' then raise;end if;end;
 begin perform public.admin_legacy_members_import(jsonb_build_array(r->0,jsonb_set(r->0,'{member_since}','"wrong"')),current_setting('rcsca.hbatch')::uuid,'Synthetic source',true,'wrong');raise exception 'partial_import_allowed';exception when raise_exception then if sqlerrm<>'import_rows_need_correction' then raise;end if;end;
end $$;
select public.admin_legacy_members_import(current_setting('rcsca.hrows')::jsonb,current_setting('rcsca.hbatch')::uuid,'Synthetic source',true,current_setting('rcsca.hpreview')::jsonb->>'fingerprint');
do $$ declare v jsonb;begin
 v:=public.admin_legacy_members_import(current_setting('rcsca.hrows')::jsonb,current_setting('rcsca.hbatch')::uuid,'Synthetic source',true,'old');if v->>'already_completed'<>'true' then raise exception 'retry_duplicated';end if;
 begin perform public.admin_legacy_members_import(current_setting('rcsca.hrows')::jsonb,current_setting('rcsca.hbatch')::uuid,'Changed source',true,'old');raise exception 'changed_retry_allowed';exception when raise_exception then if sqlerrm<>'import_batch_conflict' then raise;end if;end;
end $$;
reset role;
do $$ begin
 if (select count(*) from private.legacy_members where batch_id=current_setting('rcsca.hbatch')::uuid)<>1 then raise exception 'wrong_import_count';end if;
 if exists(select 1 from public.memberships where user_id=current_setting('rcsca.huser')::uuid) then raise exception 'import_activated_member';end if;
 if exists(select 1 from public.audit_logs where note like '%A123456789%' or note like '%1990-02-28%') then raise exception 'sensitive_audit';end if;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('rcsca.hunverified'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin begin perform public.legacy_member_preview('Synthetic original');raise exception 'unverified_preview';exception when raise_exception then if sqlerrm<>'verified_account_required' then raise;end if;end;end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('rcsca.hother'),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare v jsonb;begin
 v:=public.legacy_member_preview('Synthetic original');if v->>'status'<>'manual' or v?'member_since' then raise exception 'other_email_leaked';end if;
end $$;
select set_config('rcsca.hmanual',public.legacy_member_claim('Synthetic original','0900000000','',true)::text,true);
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('rcsca.huser'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin if public.legacy_member_preview('Synthetic original')->>'status'<>'matched' then raise exception 'email_match_failed';end if;end $$;
select set_config('rcsca.hclaim',public.legacy_member_claim('Synthetic original','','',true)::text,true);
do $$ begin if public.legacy_member_claim('Synthetic original','','',true)::text<>current_setting('rcsca.hclaim') then raise exception 'duplicate_claim';end if;end $$;
reset role;
select set_config('rcsca.hrecord',(select id::text from private.legacy_members where batch_id=current_setting('rcsca.hbatch')::uuid),true);
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('rcsca.hadmin'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 if jsonb_array_length(public.admin_legacy_member_claims())<2 then raise exception 'claims_missing';end if;
 begin perform public.admin_legacy_member_review(current_setting('rcsca.hclaim')::uuid,current_setting('rcsca.hrecord')::uuid,true,'Synthetic independent verification',false);raise exception 'unconfirmed_claim';exception when raise_exception then if sqlerrm<>'eligibility_confirmation_required' then raise;end if;end;
end $$;
select public.admin_legacy_member_review(current_setting('rcsca.hclaim')::uuid,current_setting('rcsca.hrecord')::uuid,true,'Synthetic independent verification',true);
do $$ begin
 begin perform public.admin_legacy_member_review(current_setting('rcsca.hmanual')::uuid,current_setting('rcsca.hrecord')::uuid,true,'Synthetic already linked',true);raise exception 'double_claim';exception when raise_exception then if sqlerrm<>'legacy_record_unavailable' then raise;end if;end;
 if exists(select 1 from jsonb_array_elements(public.admin_member_birthdays(2)) a where a->>'name'='Synthetic original') then raise exception 'nonconsensual_greetings';end if;
end $$;
reset role;
do $$ begin
 if not exists(select 1 from public.memberships where user_id=current_setting('rcsca.huser')::uuid and member_since='2018-03-01' and membership_type='lifetime' and status='active') then raise exception 'original_history_lost';end if;
 if not exists(select 1 from private.member_birthdays where user_id=current_setting('rcsca.huser')::uuid and birth_date='1992-02-29' and not greetings_consent) then raise exception 'import_overwrote_birthday';end if;
 if exists(select 1 from public.team_members where user_id=current_setting('rcsca.huser')::uuid) or exists(select 1 from public.point_transactions where user_id=current_setting('rcsca.huser')::uuid) then raise exception 'unexpected_points_team';end if;
end $$;
select set_config('request.jwt.claims',jsonb_build_object('sub',current_setting('rcsca.huser'),'role','authenticated')::text,true);
set local role authenticated;
select public.member_birthday_save(null,false);
do $$ begin if public.member_history_self()->>'birth_date' is not null then raise exception 'birthday_clear_failed';end if;end $$;
reset role;
select 'PASS: private birthday CRUD and consent, atomic application, validated/atomic/idempotent legacy import, encrypted identifiers, verified email prefill, manual matching privacy, independent review and single binding, original date/type preservation, no automatic points/team' as result;
rollback;
