begin;
select set_config('rcsca.ia',gen_random_uuid()::text,true),set_config('rcsca.ispecial',gen_random_uuid()::text,true),set_config('rcsca.im',gen_random_uuid()::text,true),set_config('rcsca.il',gen_random_uuid()::text,true),set_config('rcsca.ir',gen_random_uuid()::text,true),set_config('rcsca.iu',gen_random_uuid()::text,true),set_config('rcsca.ibatch',gen_random_uuid()::text,true),set_config('rcsca.iyear',extract(year from now() at time zone 'Asia/Taipei')::text,true);
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) select current_setting(k)::uuid,current_setting(k)||'@example.invalid',now(),'{}'::jsonb from unnest(array['rcsca.ia','rcsca.ispecial','rcsca.im','rcsca.il','rcsca.ir','rcsca.iu']) k;
update auth.users set email_confirmed_at=null where id=current_setting('rcsca.iu')::uuid;
insert into public.admin_roles(user_id,role_key) values(current_setting('rcsca.ia')::uuid,'admin'),(current_setting('rcsca.ispecial')::uuid,'enterprise_reviewer');
insert into public.memberships(user_id,membership_type,status,member_since) values(current_setting('rcsca.im')::uuid,'annual','active','2018-01-01'),(current_setting('rcsca.il')::uuid,'lifetime','active','2017-03-01'),(current_setting('rcsca.ir')::uuid,'annual','active','2016-01-01');
insert into private.membership_register(user_id,membership_year,membership_type,full_name,member_since,referrer_id,confirmed_by,confirmation_note,referrer_text) values(current_setting('rcsca.il')::uuid,current_setting('rcsca.iyear')::integer-1,'lifetime','Synthetic lifetime','2017-03-01',current_setting('rcsca.ir')::uuid,current_setting('rcsca.ia')::uuid,'Synthetic prior record','Synthetic existing source');
insert into public.point_transactions(user_id,tx_type,points,source_type) values(current_setting('rcsca.im')::uuid,'adjust',100,'import_test');
select set_config('rcsca.irows',jsonb_build_array(jsonb_build_object('email',current_setting('rcsca.im')||'@example.invalid','name','Synthetic annual','membership_type','annual','member_since','2018-01-01','referrer_email',''),jsonb_build_object('email',current_setting('rcsca.il')||'@example.invalid','name','Synthetic lifetime','membership_type','lifetime','member_since','2017-03-01','referrer_email',''))::text,true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.ispecial'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 begin perform public.admin_membership_import_preview('[]',current_setting('rcsca.iyear')::integer);raise exception 'specialist_preview_exposed';exception when raise_exception then if sqlerrm<>'admin_required' then raise;end if;end;
 begin perform public.admin_set_membership(current_setting('rcsca.im')::uuid,'annual','2018-01-01',null,'active','Synthetic denied');raise exception 'specialist_set_membership_allowed';exception when raise_exception then if sqlerrm<>'admin_required' then raise;end if;end;
end $$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.im'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 begin perform public.admin_membership_import_commit('[]',current_setting('rcsca.iyear')::integer,'x',current_setting('rcsca.ibatch')::uuid,'Synthetic',true);raise exception 'member_import_allowed';exception when raise_exception then if sqlerrm<>'admin_required' then raise;end if;end;
 if has_table_privilege('authenticated','private.membership_import_batches','select') or has_function_privilege('anon','public.admin_membership_import_preview(jsonb,integer)','execute') then raise exception 'import_data_exposed';end if;
end $$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.ia'),'role','authenticated')::text,true);
set local role authenticated;
select set_config('rcsca.ipreview',public.admin_membership_import_preview(current_setting('rcsca.irows')::jsonb,current_setting('rcsca.iyear')::integer)::text,true);
do $$ declare v jsonb;r jsonb:=current_setting('rcsca.irows')::jsonb;begin
 if current_setting('rcsca.ipreview')::jsonb->>'ready'<>'2' then raise exception 'valid_import_blocked: %',current_setting('rcsca.ipreview');end if;
 v:=public.admin_membership_import_preview(jsonb_set(r,'{0,member_since}','"2026-02-30"'),current_setting('rcsca.iyear')::integer);if not (v->'rows'->0->'errors')?'invalid_date' then raise exception 'invalid_calendar_date_allowed';end if;
 v:=public.admin_membership_import_preview(jsonb_set(r,'{0,member_since}','"2019-01-01"'),current_setting('rcsca.iyear')::integer);if not (v->'rows'->0->'errors')?'original_date_mismatch' then raise exception 'original_date_not_guarded';end if;
 v:=public.admin_membership_import_preview(jsonb_set(r,'{1,membership_type}','"annual"'),current_setting('rcsca.iyear')::integer);if not (v->'rows'->1->'errors')?'membership_type_mismatch' then raise exception 'lifetime_downgrade_not_guarded';end if;
 v:=public.admin_membership_import_preview(jsonb_build_array(r->0,r->0),current_setting('rcsca.iyear')::integer);if v->>'ready'<>'0' then raise exception 'duplicate_csv_rows_ready';end if;
 v:=public.admin_membership_import_preview(jsonb_set(r,'{0,email}',to_jsonb(current_setting('rcsca.iu')||'@example.invalid')),current_setting('rcsca.iyear')::integer);if not (v->'rows'->0->'errors')?'account_not_unique_or_verified' then raise exception 'unverified_account_ready';end if;
 v:=public.admin_membership_import_preview(jsonb_set(r,'{0,referrer_email}',to_jsonb(current_setting('rcsca.im')||'@example.invalid')),current_setting('rcsca.iyear')::integer);if not (v->'rows'->0->'errors')?'invalid_referrer' then raise exception 'self_referral_ready';end if;
 begin perform public.admin_membership_import_preview(jsonb_set(r,'{0,identity}','"unnecessary sensitive field"'),current_setting('rcsca.iyear')::integer);raise exception 'extra_identity_accepted';exception when raise_exception then if sqlerrm<>'invalid_import_payload' then raise;end if;end;
 begin perform public.admin_membership_import_commit(r,current_setting('rcsca.iyear')::integer,current_setting('rcsca.ipreview')::jsonb->>'fingerprint',current_setting('rcsca.ibatch')::uuid,'Synthetic proof',false);raise exception 'unconfirmed_import_allowed';exception when raise_exception then if sqlerrm<>'import_confirmation_required' then raise;end if;end;
 begin perform public.admin_membership_import_commit(jsonb_set(r,'{1,membership_type}','"annual"'),current_setting('rcsca.iyear')::integer,current_setting('rcsca.ipreview')::jsonb->>'fingerprint',current_setting('rcsca.ibatch')::uuid,'Synthetic proof',true);raise exception 'bad_partial_import_allowed';exception when raise_exception then if sqlerrm<>'import_rows_need_correction' then raise;end if;end;
 begin perform public.admin_set_membership(current_setting('rcsca.im')::uuid,'annual',current_date,null,'active','Synthetic wrong date');raise exception 'legacy_date_reset_allowed';exception when raise_exception then if sqlerrm<>'original_member_since_required' then raise;end if;end;
 begin perform public.admin_set_membership(current_setting('rcsca.il')::uuid,'annual','2017-03-01',null,'active','Synthetic wrong downgrade');raise exception 'legacy_downgrade_allowed';exception when raise_exception then if sqlerrm<>'cannot_downgrade_lifetime' then raise;end if;end;
end $$;
reset role;
do $$ begin if exists(select 1 from private.membership_register where user_id in (current_setting('rcsca.im')::uuid,current_setting('rcsca.il')::uuid) and membership_year=current_setting('rcsca.iyear')::integer) then raise exception 'preview_or_failed_batch_wrote_data';end if;end $$;
update public.memberships set updated_at=now()+interval '1 second' where user_id=current_setting('rcsca.im')::uuid;
set local role authenticated;
do $$ begin
 begin perform public.admin_membership_import_commit(current_setting('rcsca.irows')::jsonb,current_setting('rcsca.iyear')::integer,current_setting('rcsca.ipreview')::jsonb->>'fingerprint',current_setting('rcsca.ibatch')::uuid,'Synthetic proof',true);raise exception 'stale_preview_allowed';exception when raise_exception then if sqlerrm<>'import_preview_changed' then raise;end if;end;
end $$;
select set_config('rcsca.ipreview',public.admin_membership_import_preview(current_setting('rcsca.irows')::jsonb,current_setting('rcsca.iyear')::integer)::text,true);
select public.admin_membership_import_commit(current_setting('rcsca.irows')::jsonb,current_setting('rcsca.iyear')::integer,current_setting('rcsca.ipreview')::jsonb->>'fingerprint',current_setting('rcsca.ibatch')::uuid,'Synthetic proof',true);
do $$ declare v jsonb;begin
 v:=public.admin_membership_import_commit(current_setting('rcsca.irows')::jsonb,current_setting('rcsca.iyear')::integer,'stale but already completed',current_setting('rcsca.ibatch')::uuid,'Synthetic proof',true);
 if v->>'already_completed'<>'true' or v->>'count'<>'2' then raise exception 'retry_not_idempotent';end if;
 begin perform public.admin_membership_import_commit(current_setting('rcsca.irows')::jsonb,current_setting('rcsca.iyear')::integer,'x',current_setting('rcsca.ibatch')::uuid,'Changed proof',true);raise exception 'batch_content_reused';exception when raise_exception then if sqlerrm<>'import_batch_conflict' then raise;end if;end;
 v:=public.admin_membership_import_preview(current_setting('rcsca.irows')::jsonb,current_setting('rcsca.iyear')::integer);if v->>'ready'<>'0' then raise exception 'confirmed_year_ready_again';end if;
end $$;
select public.admin_set_membership(current_setting('rcsca.il')::uuid,'lifetime','2017-03-01',null,'active','Synthetic unchanged membership');
select public.admin_set_membership(current_setting('rcsca.il')::uuid,'lifetime','2017-03-01',null,'active','Synthetic repeated update');
reset role;
do $$ begin
 if (select count(*) from private.membership_import_batches where id=current_setting('rcsca.ibatch')::uuid)<>1 then raise exception 'duplicate_import_batch';end if;
 if (select count(*) from private.membership_register where user_id in (current_setting('rcsca.im')::uuid,current_setting('rcsca.il')::uuid) and membership_year=current_setting('rcsca.iyear')::integer)<>2 then raise exception 'import_count_incorrect';end if;
 if not exists(select 1 from private.membership_register where user_id=current_setting('rcsca.il')::uuid and membership_year=current_setting('rcsca.iyear')::integer and referrer_id=current_setting('rcsca.ir')::uuid and referrer_text='Synthetic existing source') then raise exception 'existing_referrer_lost';end if;
 if private.member_points_wallet(current_setting('rcsca.im')::uuid)->>'balance'<>'100' or (select count(*) from public.point_transactions where user_id=current_setting('rcsca.im')::uuid)<>1 then raise exception 'import_changed_points';end if;
 if exists(select 1 from public.team_members where user_id in (current_setting('rcsca.im')::uuid,current_setting('rcsca.il')::uuid)) then raise exception 'import_joined_team_without_consent';end if;
end $$;
-- Legacy records can have a confirmed historical date but a blank membership date.
update public.memberships set member_since=null where user_id=current_setting('rcsca.ir')::uuid;
insert into private.membership_register(user_id,membership_year,membership_type,full_name,member_since,confirmed_by) values(current_setting('rcsca.ir')::uuid,current_setting('rcsca.iyear')::integer-1,'annual','Synthetic historical','2016-01-01',current_setting('rcsca.ia')::uuid);
set local role authenticated;
do $$ begin
 begin perform public.admin_membership_confirm_existing(current_setting('rcsca.ir')::uuid,'Synthetic historical','2020-01-01',current_setting('rcsca.iyear')::integer,null,'Synthetic wrong historical date');raise exception 'historical_date_reset_allowed';exception when raise_exception then if sqlerrm<>'original_member_since_required' then raise;end if;end;
end $$;
select public.admin_membership_confirm_existing(current_setting('rcsca.ir')::uuid,'Synthetic historical','2016-01-01',current_setting('rcsca.iyear')::integer,null,'Synthetic historical proof');
reset role;
do $$ begin if not exists(select 1 from public.memberships where user_id=current_setting('rcsca.ir')::uuid and member_since='2016-01-01') then raise exception 'verified_date_not_preserved_on_membership';end if;end $$;
select 'PASS: import privacy/role boundaries, verified accounts, strict types/dates, duplicate and stale guards, atomic validation, idempotent retry, inherited sources, unchanged points/teams, legacy date and lifetime protections' as result;
rollback;
