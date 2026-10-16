begin;
select set_config('rcsca.reg_owner',gen_random_uuid()::text,true),set_config('rcsca.reg_reviewer',gen_random_uuid()::text,true),set_config('rcsca.reg_other',gen_random_uuid()::text,true),set_config('rcsca.reg_key',gen_random_uuid()::text,true);
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
select current_setting(setting)::uuid,current_setting(setting)||'@example.invalid',now(),'{}'::jsonb from unnest(array['rcsca.reg_owner','rcsca.reg_reviewer','rcsca.reg_other']) setting;
insert into public.admin_roles(user_id,role_key) values(current_setting('rcsca.reg_reviewer')::uuid,'enterprise_reviewer');
select set_config('rcsca.reg_details',jsonb_build_object('company_name','Synthetic registration','tax_id','87654321','industry','活動公關','region','臺北市','address','Private synthetic address','website_url','https://example.invalid','contact_name','Synthetic contact','contact_title','Project manager','contact_email','synthetic@example.invalid','contact_phone','02-20000000','phone_extension','123','mobile','0900000000','contribution_kind','both','contribution_description','Synthetic product and service; monthly; Taipei.','direction','consult')::text,true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.reg_owner'),'role','authenticated')::text,true);
set local role authenticated;
do $$declare k uuid:=current_setting('rcsca.reg_key')::uuid;d jsonb:=current_setting('rcsca.reg_details')::jsonb;begin
 begin perform public.submit_enterprise_registration(d-'address',k);raise exception 'missing_address_allowed';exception when raise_exception then if sqlerrm<>'required_fields_missing' then raise;end if;end;
 begin perform public.submit_enterprise_registration(d||'{"website_url":"javascript:alert(1)"}',k);raise exception 'unsafe_website_allowed';exception when raise_exception then if sqlerrm<>'invalid_website' then raise;end if;end;
 begin perform public.submit_enterprise_registration(d||'{"tax_id":"ABC"}',k);raise exception 'bad_tax_allowed';exception when raise_exception then if sqlerrm<>'invalid_tax_id' then raise;end if;end;
 begin perform public.submit_enterprise_registration(d||'{"mobile":"abc"}',k);raise exception 'bad_phone_allowed';exception when raise_exception then if sqlerrm<>'invalid_phone' then raise;end if;end;
 begin perform public.submit_enterprise_registration(d||'{"status":"approved"}',k);raise exception 'injected_status_allowed';exception when raise_exception then if sqlerrm<>'invalid_registration' then raise;end if;end;
 perform set_config('rcsca.reg_app',public.submit_enterprise_registration(d,k)::text,true);
 if public.submit_enterprise_registration(d,k)::text<>current_setting('rcsca.reg_app') then raise exception 'retry_duplicated';end if;
 begin perform public.submit_enterprise_registration(d||'{"company_name":"changed"}',k);raise exception 'key_conflict_allowed';exception when raise_exception then if sqlerrm<>'request_conflict' then raise;end if;end;
 begin perform public.submit_enterprise_registration(d,gen_random_uuid());raise exception 'duplicate_application_allowed';exception when raise_exception then if sqlerrm<>'application_already_exists' then raise;end if;end;
 begin perform public.submit_enterprise_registration(d,gen_random_uuid(),current_setting('rcsca.reg_app')::uuid);raise exception 'pending_edit_allowed';exception when raise_exception then if sqlerrm<>'application_not_editable' then raise;end if;end;
 if (select count(*) from public.enterprise_applications where id=current_setting('rcsca.reg_app')::uuid and address='Private synthetic address' and contact_title='Project manager' and mobile='0900000000' and contribution_kind='both' and status='submitted')<>1 then raise exception 'registration_data_missing';end if;
 if has_table_privilege('authenticated','public.enterprise_applications','UPDATE') then raise exception 'direct_updates_allowed';end if;
end$$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.reg_other'),'role','authenticated')::text,true);
set local role authenticated;
do $$begin
 if exists(select 1 from public.enterprise_applications where id=current_setting('rcsca.reg_app')::uuid) then raise exception 'other_user_contact_leak';end if;
 begin perform public.submit_enterprise_registration(current_setting('rcsca.reg_details')::jsonb,gen_random_uuid(),current_setting('rcsca.reg_app')::uuid);raise exception 'other_user_edit_allowed';exception when raise_exception then if sqlerrm<>'application_not_found' then raise;end if;end;
end$$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.reg_reviewer'),'role','authenticated')::text,true);
set local role authenticated;
do $$begin
 if not exists(select 1 from public.enterprise_applications where id=current_setting('rcsca.reg_app')::uuid and contribution_description like 'Synthetic product%') then raise exception 'reviewer_cannot_read';end if;
 perform public.admin_review_enterprise_application(current_setting('rcsca.reg_app')::uuid,'needs_info','Please clarify service.');
end$$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.reg_owner'),'role','authenticated')::text,true);
set local role authenticated;
do $$declare d jsonb:=current_setting('rcsca.reg_details')::jsonb||'{"contribution_description":"Corrected synthetic service"}';begin
 if public.submit_enterprise_registration(d,gen_random_uuid(),current_setting('rcsca.reg_app')::uuid)::text<>current_setting('rcsca.reg_app') then raise exception 'resubmit_created_new';end if;
end$$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.reg_reviewer'),'role','authenticated')::text,true);
set local role authenticated;
select public.admin_review_enterprise_application(current_setting('rcsca.reg_app')::uuid,'approved','Synthetic verification complete');
reset role;
do $$begin
 if not exists(select 1 from public.enterprises e join public.enterprise_applications a on a.enterprise_id=e.id where a.id=current_setting('rcsca.reg_app')::uuid and e.industry='活動公關') then raise exception 'approved_industry_missing';end if;
 if exists(select 1 from public.memberships where user_id=current_setting('rcsca.reg_owner')::uuid) then raise exception 'automatic_membership';end if;
 if exists(select 1 from public.enterprise_shares s join public.enterprise_applications a on a.enterprise_id=s.enterprise_id where a.id=current_setting('rcsca.reg_app')::uuid) then raise exception 'automatic_public_share';end if;
end$$;
select 'PASS: complete enterprise registration validation, private contacts, reviewer access, idempotent retry, duplicate/status guards, owner-only correction, approved industry, no automatic membership or published contribution' as result;
rollback;
