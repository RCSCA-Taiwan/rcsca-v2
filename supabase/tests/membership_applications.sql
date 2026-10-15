-- Synthetic users and Vault entries are confined to a rolled-back transaction.
begin;
select set_config('rcsca.applicant',gen_random_uuid()::text,true);
select set_config('rcsca.reviewer',gen_random_uuid()::text,true);
select set_config('rcsca.referrer',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data)
select current_setting(k)::uuid,current_setting(k)||'@example.invalid','{}'::jsonb
from unnest(array['rcsca.applicant','rcsca.reviewer','rcsca.referrer']) k;
update public.profiles set display_name='Synthetic referrer' where id=current_setting('rcsca.referrer')::uuid;
insert into public.admin_roles(user_id,role_key) values(current_setting('rcsca.reviewer')::uuid,'admin');
insert into public.memberships(user_id,membership_type,status) values(current_setting('rcsca.referrer')::uuid,'lifetime','active');
insert into public.teams(name,is_active) values('Synthetic membership team',true) returning set_config('rcsca.team',id::text,true);
insert into public.team_members(team_id,user_id) values(current_setting('rcsca.team')::uuid,current_setting('rcsca.referrer')::uuid);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.applicant'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
  if has_table_privilege('authenticated','private.membership_applications','select') then raise exception 'raw_application_table_exposed'; end if;
  begin perform 1 from vault.decrypted_secrets limit 1; raise exception 'vault_exposed'; exception when insufficient_privilege then null; end;
  if has_function_privilege('anon','public.membership_directory(integer)','execute') then raise exception 'anonymous_roster_exposed'; end if;
  begin perform public.membership_directory(extract(year from now() at time zone 'Asia/Taipei')::int);raise exception 'nonmember_roster_exposed';exception when raise_exception then if sqlerrm<>'active_membership_required' then raise; end if;end;
  begin perform public.admin_membership_applications();raise exception 'admin_queue_exposed';exception when raise_exception then if sqlerrm<>'admin_required' then raise; end if;end;
  begin perform public.membership_submit('new','annual','Synthetic member','A123456789','0900000000','test@example.invalid','Synthetic address',null,null,false,false);raise exception 'missing_consent_accepted';exception when raise_exception then if sqlerrm<>'consent_required' then raise; end if;end;
  begin perform public.membership_submit('new','pending','Synthetic member','A123456789','0900000000','test@example.invalid','Synthetic address',null,null,false,true);raise exception 'invalid_type_accepted';exception when raise_exception then if sqlerrm<>'invalid_application' then raise; end if;end;
  begin perform public.membership_submit('new','annual','Synthetic member','A123456788','0900000000','test@example.invalid','Synthetic address',null,null,false,true);raise exception 'bad_checksum_accepted';exception when raise_exception then if sqlerrm<>'invalid_identity' then raise; end if;end;
  begin perform public.membership_submit('renewal','annual','Synthetic member','A123456789','0900000000','test@example.invalid','Synthetic address',null,null,false,true);raise exception 'nonmember_renewal_accepted';exception when raise_exception then if sqlerrm<>'renewal_membership_not_found' then raise; end if;end;
end $$;
select set_config('rcsca.application', public.membership_submit('new','annual','Synthetic member','A123456789','0900000000','test@example.invalid','Synthetic address',current_setting('rcsca.referrer')::uuid,current_setting('rcsca.team')::uuid,true,true)::text,true);
do $$ begin
  if public.membership_applications_self()::text like '%A123456789%' or public.membership_applications_self()::text like '%identity_secret_id%' then raise exception 'identity_exposed'; end if;
  begin perform public.membership_submit('new','annual','Synthetic member','A123456789','0900000000','test@example.invalid','Synthetic address',null,null,false,true);raise exception 'duplicate_submission_accepted';exception when raise_exception then if sqlerrm<>'application_pending' then raise; end if;end;
end $$;
reset role;
do $$ begin
  if exists(select 1 from public.memberships where user_id=current_setting('rcsca.applicant')::uuid) then raise exception 'pending_application_activated_membership'; end if;
  if exists(select 1 from public.team_members where user_id=current_setting('rcsca.applicant')::uuid) then raise exception 'pending_application_joined_team'; end if;
end $$;
insert into public.admin_roles(user_id,role_key) values(current_setting('rcsca.applicant')::uuid,'admin');
set local role authenticated;
do $$ begin
  begin perform public.admin_membership_review(current_setting('rcsca.application')::uuid,'approved','Synthetic review',current_date,extract(year from now() at time zone 'Asia/Taipei')::int,true);raise exception 'self_review_accepted';exception when raise_exception then if sqlerrm<>'cannot_review_own_application' then raise; end if;end;
end $$;
reset role;
delete from public.admin_roles where user_id=current_setting('rcsca.applicant')::uuid;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.reviewer'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
  begin perform public.admin_membership_review(current_setting('rcsca.application')::uuid,'approved','Synthetic review',current_date,extract(year from now() at time zone 'Asia/Taipei')::int,false);raise exception 'unconfirmed_eligibility_accepted';exception when raise_exception then if sqlerrm<>'eligibility_confirmation_required' then raise; end if;end;
end $$;
select public.admin_membership_review(current_setting('rcsca.application')::uuid,'approved','Synthetic review',current_date,extract(year from now() at time zone 'Asia/Taipei')::int,true);
do $$ begin
  begin perform public.admin_membership_review(current_setting('rcsca.application')::uuid,'approved','Synthetic duplicate',current_date,extract(year from now() at time zone 'Asia/Taipei')::int,true);raise exception 'duplicate_approval_accepted';exception when raise_exception then if sqlerrm<>'application_not_pending' then raise; end if;end;
end $$;
reset role;
do $$ begin
  if not exists(select 1 from public.memberships where user_id=current_setting('rcsca.applicant')::uuid and status='active') then raise exception 'membership_not_activated'; end if;
  if not exists(select 1 from public.team_members where user_id=current_setting('rcsca.applicant')::uuid and team_id=current_setting('rcsca.team')::uuid and left_at is null) then raise exception 'team_not_linked'; end if;
  if (select count(*) from private.membership_register where application_id=current_setting('rcsca.application')::uuid)<>1 then raise exception 'roster_not_created_once'; end if;
  if exists(select 1 from public.point_transactions where user_id=current_setting('rcsca.applicant')::uuid) then raise exception 'membership_created_points'; end if;
end $$;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.applicant'),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare v jsonb; begin
  v:=public.membership_directory(extract(year from now() at time zone 'Asia/Taipei')::int);
  if v::text not like '%Synthetic member%' then raise exception 'roster_missing_member'; end if;
  if v::text like '%phone%' or v::text like '%email%' or v::text like '%address%' or v::text like '%identity%' then raise exception 'roster_contains_sensitive_fields'; end if;
end $$;
-- Review a renewal with a different original date must fail without rewriting history.
select set_config('rcsca.renewal',public.membership_submit('renewal','annual','Synthetic member','A123456789','0900000000','test@example.invalid','Synthetic address',null,null,false,true)::text,true);
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.reviewer'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
  begin perform public.admin_membership_review(current_setting('rcsca.renewal')::uuid,'approved','Synthetic renewal',current_date-1,extract(year from now() at time zone 'Asia/Taipei')::int,true);raise exception 'original_join_date_overwritten';exception when raise_exception then if sqlerrm<>'original_member_since_required' then raise; end if;end;
end $$;
select public.admin_membership_review(current_setting('rcsca.renewal')::uuid,'needs_info','Synthetic request for more information',null,null,false);
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.applicant'),'role','authenticated')::text,true);
set local role authenticated;
select set_config('rcsca.rejected',public.membership_submit('renewal','annual','Synthetic member','A123456789','0900000000','test@example.invalid','Synthetic address',null,null,false,true)::text,true);
reset role;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.reviewer'),'role','authenticated')::text,true);
set local role authenticated;
select public.admin_membership_review(current_setting('rcsca.rejected')::uuid,'rejected','Synthetic rejection',null,null,false);
reset role;
select 'PASS: membership submission, encrypted ID, access checks, duplicate guards, approval, team linkage, directory privacy, original date, needs-info and rejection';
rollback;
