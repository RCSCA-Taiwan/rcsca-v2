begin;
select set_config('rcsca.data_member',gen_random_uuid()::text,true);
select set_config('rcsca.data_delete',gen_random_uuid()::text,true);
select set_config('rcsca.data_edit',gen_random_uuid()::text,true);
select set_config('rcsca.data_admin',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data)
select current_setting(k)::uuid,current_setting(k)||'@example.invalid','{}'::jsonb
from unnest(array['rcsca.data_member','rcsca.data_delete','rcsca.data_edit','rcsca.data_admin']) k;
insert into public.admin_roles(user_id,role_key) values(current_setting('rcsca.data_admin')::uuid,'admin');

-- Submission guards stay intact.
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.data_member'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 if has_table_privilege('authenticated','private.personal_data_requests','select') then raise exception 'raw_data_requests_exposed';end if;
 if has_function_privilege('anon','public.personal_data_requests_self()','execute') then raise exception 'anonymous_requests_exposed';end if;
 begin perform public.admin_personal_data_requests();raise exception 'admin_requests_exposed';exception when raise_exception then if sqlerrm<>'admin_required' then raise;end if;end;
 begin perform public.personal_data_request_submit('reset','{}','Synthetic reset',true,false);raise exception 'single_confirmation_accepted';exception when raise_exception then if sqlerrm<>'two_confirmations_required' then raise;end if;end;
 begin perform public.personal_data_request_submit('edit','{"membership_type":"lifetime"}','Synthetic edit',false,false);raise exception 'privileged_change_accepted';exception when raise_exception then if sqlerrm<>'invalid_requested_changes' then raise;end if;end;
end $$;
reset role;

-- Reset fixture: preserve formal membership history, but zero current progress and require reapplication.
update public.profiles set display_name='Synthetic retained profile',mobile='0911000000' where id=current_setting('rcsca.data_member')::uuid;
insert into public.memberships(user_id,membership_type,status,member_since)
values(current_setting('rcsca.data_member')::uuid,'annual','active','2020-01-01');
insert into public.point_transactions(user_id,tx_type,points,source_type)
values(current_setting('rcsca.data_member')::uuid,'adjust',50,'data_request_test');
insert into public.xp_transactions(user_id,xp,source_type)
values(current_setting('rcsca.data_member')::uuid,42,'data_request_test');
insert into public.member_levels(user_id,level,lifetime_xp)
values(current_setting('rcsca.data_member')::uuid,4,42)
on conflict(user_id) do update set level=4,lifetime_xp=42;
insert into public.sharing_footprints(user_id,footprint_type,source_type,description)
values(current_setting('rcsca.data_member')::uuid,'synthetic','data_request_test','Synthetic footprint');
insert into private.member_birthdays(user_id,birth_date,greetings_consent)
values(current_setting('rcsca.data_member')::uuid,'1990-01-02',true);
insert into private.member_contact_details(user_id,contact_email,address)
values(current_setting('rcsca.data_member')::uuid,'member@example.invalid','Synthetic address');

select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.data_member'),'role','authenticated')::text,true);
set local role authenticated;
select set_config('rcsca.data_request',public.personal_data_request_submit('reset','{}','Synthetic reset execution',true,true)::text,true);
do $$ begin
 if public.personal_data_requests_self()->0->>'reset_scope'<>'profile_points_xp_level_footprints' then raise exception 'reset_scope_lost';end if;
 begin perform public.personal_data_request_submit('delete','{}','Duplicate',true,true);raise exception 'duplicate_request_accepted';exception when raise_exception then if sqlerrm<>'existing_data_request_pending' then raise;end if;end;
end $$;
reset role;

-- A different admin must review; completion can only occur through the executor.
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.data_admin'),'role','authenticated')::text,true);
set local role authenticated;
select public.admin_personal_data_request_review(current_setting('rcsca.data_request')::uuid,'approved','Synthetic approved; execution pending',false);
do $$ begin
 begin perform public.admin_personal_data_request_review(current_setting('rcsca.data_request')::uuid,'completed','Bypass executor',true);raise exception 'manual_completion_allowed';exception when raise_exception then if sqlerrm<>'execution_requires_executor' then raise;end if;end;
end $$;
select public.admin_personal_data_request_execute(current_setting('rcsca.data_request')::uuid,'Synthetic reset executed');
reset role;

do $$ begin
 if (select status from private.personal_data_requests where id=current_setting('rcsca.data_request')::uuid)<>'completed' then raise exception 'reset_not_completed';end if;
 if (select executed_at is null or executed_by is null from private.personal_data_requests where id=current_setting('rcsca.data_request')::uuid) then raise exception 'execution_receipt_missing';end if;
 if (select coalesce(sum(points),0) from public.point_transactions where user_id=current_setting('rcsca.data_member')::uuid)<>0 then raise exception 'reset_points_not_zero';end if;
 if (select level<>1 or lifetime_xp<>0 from public.member_levels where user_id=current_setting('rcsca.data_member')::uuid) then raise exception 'reset_level_wrong';end if;
 if exists(select 1 from public.sharing_footprints where user_id=current_setting('rcsca.data_member')::uuid) then raise exception 'reset_footprints_retained';end if;
 if exists(select 1 from private.member_birthdays where user_id=current_setting('rcsca.data_member')::uuid) then raise exception 'reset_birthday_retained';end if;
 if exists(select 1 from private.member_contact_details where user_id=current_setting('rcsca.data_member')::uuid) then raise exception 'reset_contact_retained';end if;
 if (select display_name is not null or mobile is not null or not is_active from public.profiles where id=current_setting('rcsca.data_member')::uuid) then raise exception 'reset_profile_wrong';end if;
 if (select status from public.memberships where user_id=current_setting('rcsca.data_member')::uuid)<>'inactive' then raise exception 'reset_membership_not_inactive';end if;
 if (select member_since from public.memberships where user_id=current_setting('rcsca.data_member')::uuid)<>'2020-01-01'::date then raise exception 'reset_membership_history_lost';end if;
 if (select membership_type from public.memberships where user_id=current_setting('rcsca.data_member')::uuid)<>'annual'::public.membership_type then raise exception 'reset_membership_type_lost';end if;
 if not exists(select 1 from public.xp_transactions where user_id=current_setting('rcsca.data_member')::uuid and xp=42) then raise exception 'xp_audit_history_lost';end if;
end $$;

-- Delete means privacy-preserving deactivation, not destructive removal of historical rows.
update public.profiles set display_name='Delete Me',mobile='0922000000' where id=current_setting('rcsca.data_delete')::uuid;
insert into public.memberships(user_id,membership_type,status,member_since)
values(current_setting('rcsca.data_delete')::uuid,'lifetime','active','2019-03-04');
insert into public.point_transactions(user_id,tx_type,points,source_type)
values(current_setting('rcsca.data_delete')::uuid,'adjust',25,'data_delete_test');
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.data_delete'),'role','authenticated')::text,true);
set local role authenticated;
select set_config('rcsca.delete_request',public.personal_data_request_submit('delete','{}','Synthetic deletion',true,true)::text,true);
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.data_admin'),'role','authenticated')::text,true);
set local role authenticated;
select public.admin_personal_data_request_review(current_setting('rcsca.delete_request')::uuid,'approved','Synthetic delete approved',false);
select public.admin_personal_data_request_execute(current_setting('rcsca.delete_request')::uuid,'Synthetic delete executed');
reset role;
do $$ begin
 if (select is_active from public.profiles where id=current_setting('rcsca.data_delete')::uuid) then raise exception 'deleted_profile_still_active';end if;
 if (select display_name is not null or mobile is not null from public.profiles where id=current_setting('rcsca.data_delete')::uuid) then raise exception 'deleted_profile_pii_retained';end if;
 if (select coalesce(sum(points),0) from public.point_transactions where user_id=current_setting('rcsca.data_delete')::uuid)<>0 then raise exception 'delete_points_not_zero';end if;
 if (select status from public.memberships where user_id=current_setting('rcsca.data_delete')::uuid)<>'inactive' then raise exception 'delete_membership_active';end if;
 if (select membership_type from public.memberships where user_id=current_setting('rcsca.data_delete')::uuid)<>'lifetime'::public.membership_type then raise exception 'delete_membership_history_lost';end if;
end $$;

-- Edit applies only the reviewed current fields and stores contact details separately from Auth login identity.
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.data_edit'),'role','authenticated')::text,true);
set local role authenticated;
select set_config('rcsca.edit_request',public.personal_data_request_submit('edit','{"display_name":"Edited Name","mobile":"0933000000","contact_email":"contact@example.invalid","address":"Edited address"}','Synthetic edit',false,false)::text,true);
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.data_admin'),'role','authenticated')::text,true);
set local role authenticated;
select public.admin_personal_data_request_review(current_setting('rcsca.edit_request')::uuid,'approved','Synthetic edit approved',false);
select public.admin_personal_data_request_execute(current_setting('rcsca.edit_request')::uuid,'Synthetic edit executed');
reset role;
do $$ begin
 if (select display_name from public.profiles where id=current_setting('rcsca.data_edit')::uuid)<>'Edited Name' then raise exception 'edit_name_failed';end if;
 if (select mobile from public.profiles where id=current_setting('rcsca.data_edit')::uuid)<>'0933000000' then raise exception 'edit_mobile_failed';end if;
 if (select contact_email from private.member_contact_details where user_id=current_setting('rcsca.data_edit')::uuid)<>'contact@example.invalid' then raise exception 'edit_contact_email_failed';end if;
 if (select address from private.member_contact_details where user_id=current_setting('rcsca.data_edit')::uuid)<>'Edited address' then raise exception 'edit_address_failed';end if;
end $$;

select 'PASS: personal data requests require guarded execution; reset zeroes current progress while preserving formal history; delete deactivates and de-identifies; edit applies reviewed fields';
rollback;
