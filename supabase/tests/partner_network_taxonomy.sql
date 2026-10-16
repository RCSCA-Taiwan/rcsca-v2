begin;
select set_config('rcsca.tax_owner',gen_random_uuid()::text,true),set_config('rcsca.tax_reviewer',gen_random_uuid()::text,true),set_config('rcsca.tax_request',gen_random_uuid()::text,true);
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data)
select current_setting(setting)::uuid,current_setting(setting)||'@example.invalid',now(),'{}'::jsonb from unnest(array['rcsca.tax_owner','rcsca.tax_reviewer']) setting;
insert into public.admin_roles(user_id,role_key) values(current_setting('rcsca.tax_reviewer')::uuid,'enterprise_reviewer');
select set_config('rcsca.tax_details',jsonb_build_object('industry_code','events.planning','professional_codes',jsonb_build_array('design.video'),'network_public_consent',true,'network_public_description','Synthetic public professional introduction','company_name','Synthetic categorized partner','tax_id','23456789','industry','ignored client label','region','臺北市','address','Private address must not be published','website_url','https://example.invalid','contact_name','Private contact','contact_title','Manager','contact_email','private@example.invalid','contact_phone','02-20000000','phone_extension','','mobile','0900000000','contribution_kind','service','contribution_description','Private pricing and scheduling conditions','direction','consult')::text,true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.tax_owner'),'role','authenticated')::text,true);
set local role authenticated;
do $$declare d jsonb:=current_setting('rcsca.tax_details')::jsonb;key uuid:=current_setting('rcsca.tax_request')::uuid;begin
 begin perform public.submit_enterprise_registration(d||'{"industry_code":"unknown"}',key);raise exception 'unknown_category_accepted';exception when raise_exception then if sqlerrm<>'invalid_industry_category' then raise;end if;end;
 begin perform public.submit_enterprise_registration(d||'{"professional_codes":["unknown"]}',key);raise exception 'unknown_specialty_accepted';exception when raise_exception then if sqlerrm<>'invalid_professional_categories' then raise;end if;end;
 begin perform public.submit_enterprise_registration(d||'{"network_public_description":""}',key);raise exception 'missing_public_description_accepted';exception when raise_exception then if sqlerrm<>'public_description_required' then raise;end if;end;
 perform set_config('rcsca.tax_app',public.submit_enterprise_registration(d,key)::text,true);
 if public.submit_enterprise_registration(d,key)::text<>current_setting('rcsca.tax_app') then raise exception 'request_duplicated';end if;
 begin perform public.submit_enterprise_registration(d||'{"professional_codes":["events.photo"]}',key);raise exception 'changed_mapping_on_retry';exception when raise_exception then if sqlerrm<>'request_conflict' then raise;end if;end;
 if (select industry from public.enterprise_applications where id=current_setting('rcsca.tax_app')::uuid)<>'活動、公關與展演／活動企劃執行' then raise exception 'client_label_trusted';end if;
 begin perform public.network_submit_categorized_profile('unknown','Synthetic category node','Test','','Test');raise exception 'unknown_network_category_accepted';exception when raise_exception then if sqlerrm<>'invalid_industry_category' then raise;end if;end;
 perform public.network_submit_categorized_profile('legal.law','Synthetic category node','Test','','Test');
end$$;
reset role;
set local role anon;
do $$begin if exists(select 1 from public.public_network_directory where display_name in ('Synthetic categorized partner','Synthetic category node')) then raise exception 'pending_registration_published';end if;end$$;
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.tax_reviewer'),'role','authenticated')::text,true);
set local role authenticated;
select set_config('rcsca.tax_enterprise',public.admin_review_enterprise_application(current_setting('rcsca.tax_app')::uuid,'approved','Verified classification and consented public introduction')::text,true);
reset role;
do $$begin
 if (select count(*) from public.enterprise_network_entries where enterprise_id=current_setting('rcsca.tax_enterprise')::uuid)<>2 then raise exception 'primary_specialty_mapping_missing';end if;
 if (select count(*) from public.network_categories)<>176 then raise exception 'taxonomy_catalog_count_changed';end if;
 if has_table_privilege('authenticated','public.enterprise_network_entries','INSERT') then raise exception 'direct_mapping_write_granted';end if;
end$$;
set local role anon;
do $$begin
 if (select count(*) from public.public_network_directory where display_name='Synthetic categorized partner' and category in ('events.planning','design.video') and public_description='Synthetic public professional introduction')<>2 then raise exception 'approved_public_mapping_missing';end if;
 if exists(select 1 from public.public_network_directory where display_name='Synthetic categorized partner' and public_description like '%Private%') then raise exception 'private_registration_detail_leaked';end if;
end$$;
reset role;
update public.enterprises set status='cancelled' where id=current_setting('rcsca.tax_enterprise')::uuid;
set local role anon;
do $$begin if exists(select 1 from public.public_network_directory where display_name='Synthetic categorized partner') then raise exception 'inactive_partner_still_public';end if;end$$;
reset role;
select 'PASS: shared 176-category catalog, strict category validation, primary and cross-industry mappings, retry conflicts, pending privacy, consented approval-to-network publication, no private contact leakage and inactive partner hiding' as result;
rollback;
