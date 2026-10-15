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
-- Confirm a real preexisting membership with explicit source evidence, without inventing dates.
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.reviewer'),'role','authenticated')::text,true);
set local role authenticated;
select public.admin_membership_confirm_existing(current_setting('rcsca.referrer')::uuid,'Synthetic referrer',current_date,extract(year from now() at time zone 'Asia/Taipei')::int,null,'Synthetic historical record checked');
reset role;
insert into public.teams(name,is_active) values('Synthetic second team',true) returning set_config('rcsca.team2',id::text,true);
do $$ begin
  if not exists(select 1 from private.membership_register where user_id=current_setting('rcsca.referrer')::uuid and confirmation_note='Synthetic historical record checked') then raise exception 'confirmation_evidence_missing'; end if;
  if (select count(*) from private.membership_register where user_id=current_setting('rcsca.applicant')::uuid)<>1 then raise exception 'renewal_rejection_changed_history'; end if;
  -- The unique index prevents all legacy/new paths from racing into two active teams.
  begin insert into public.team_members(team_id,user_id) values(current_setting('rcsca.team')::uuid,current_setting('rcsca.reviewer')::uuid);
    insert into public.team_members(team_id,user_id) values(current_setting('rcsca.team2')::uuid,current_setting('rcsca.reviewer')::uuid);
    raise exception 'two_active_teams_accepted';
  exception when unique_violation then null; end;
end $$;
-- A specialist reviewer has no membership review or contact-list access.
insert into public.admin_roles(user_id,role_key) values(current_setting('rcsca.referrer')::uuid,'enterprise_reviewer');
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.referrer'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
  begin perform public.admin_membership_applications();raise exception 'specialist_read_membership_queue';exception when raise_exception then if sqlerrm<>'admin_required' then raise; end if;end;
  begin perform public.admin_membership_review(current_setting('rcsca.rejected')::uuid,'approved','Synthetic specialist',current_date,extract(year from now() at time zone 'Asia/Taipei')::int,true);raise exception 'specialist_reviewed_membership';exception when raise_exception then if sqlerrm<>'admin_required' then raise; end if;end;
end $$;
reset role;
-- Free text is preserved; only unique verified links may auto-fill a team.
select set_config('rcsca.source_applicant',gen_random_uuid()::text,true);
insert into auth.users(id,email,raw_user_meta_data) values(current_setting('rcsca.source_applicant')::uuid,current_setting('rcsca.source_applicant')||'@example.invalid','{}'::jsonb);
insert into public.enterprises(tax_id,legal_name,display_name,status) values(gen_random_uuid()::text,'Synthetic source company legal','Synthetic source company','approved') returning set_config('rcsca.source_company',id::text,true);
insert into public.enterprise_users(enterprise_id,user_id,role) values(current_setting('rcsca.source_company')::uuid,current_setting('rcsca.referrer')::uuid,'manager');
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.source_applicant'),'role','authenticated')::text,true);
set local role authenticated;
do $$ declare v jsonb; begin
  v:=public.membership_source_preview('  Synthetic   referrer  ');
  if v->>'team_id' is distinct from current_setting('rcsca.team') or v->>'source_kind'<>'member' then raise exception 'person_text_team_not_resolved'; end if;
  v:=public.membership_source_preview('Synthetic source company');
  if v->>'team_id' is distinct from current_setting('rcsca.team') or v->>'source_kind'<>'enterprise' then raise exception 'enterprise_text_team_not_resolved'; end if;
  if public.membership_source_preview('Synthetic unlisted source')->>'status'<>'unmatched' then raise exception 'unknown_source_matched'; end if;
end $$;
select set_config('rcsca.source_application',public.membership_submit_with_source('new','annual','Synthetic source applicant','A123456789','0900000000','source@example.invalid','Synthetic address','Synthetic source company',true,true)::text,true);
reset role;
do $$ begin
  if not exists(select 1 from private.membership_applications where id=current_setting('rcsca.source_application')::uuid and referrer_text='Synthetic source company' and referrer_enterprise_id=current_setting('rcsca.source_company')::uuid and proposed_team_id=current_setting('rcsca.team')::uuid) then raise exception 'enterprise_source_not_preserved'; end if;
end $$;
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.reviewer'),'role','authenticated')::text,true);
set local role authenticated;
select public.admin_membership_review(current_setting('rcsca.source_application')::uuid,'approved','Synthetic source company verified',current_date,extract(year from now() at time zone 'Asia/Taipei')::int,true);
reset role;
do $$ begin
  if not exists(select 1 from public.team_members where user_id=current_setting('rcsca.source_applicant')::uuid and team_id=current_setting('rcsca.team')::uuid and left_at is null) then raise exception 'enterprise_team_not_joined'; end if;
  if not exists(select 1 from private.membership_register where application_id=current_setting('rcsca.source_application')::uuid and referrer_enterprise_id=current_setting('rcsca.source_company')::uuid) then raise exception 'enterprise_roster_source_lost'; end if;
end $$;
-- Duplicate names must never select an arbitrary account/company or team.
insert into public.enterprises(tax_id,legal_name,display_name,status) values(gen_random_uuid()::text,'Synthetic collision company legal','Synthetic referrer','approved');
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.source_applicant'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
  if public.membership_source_preview('Synthetic referrer')->>'status'<>'ambiguous' then raise exception 'ambiguous_name_matched'; end if;
  begin perform public.membership_submit_with_source('renewal','annual','Synthetic source applicant','A123456789','0900000000','source@example.invalid','Synthetic address','Synthetic referrer',true,true);raise exception 'ambiguous_team_join_accepted';exception when raise_exception then if sqlerrm<>'source_team_not_unique' then raise; end if;end;
end $$;
select set_config('rcsca.unlisted_application',public.membership_submit_with_source('renewal','annual','Synthetic source applicant','A123456789','0900000000','source@example.invalid','Synthetic address','Synthetic unlisted source',false,true)::text,true);
reset role;
do $$ begin
  if not exists(select 1 from private.membership_applications where id=current_setting('rcsca.unlisted_application')::uuid and referrer_text='Synthetic unlisted source' and source_resolution='unmatched' and proposed_team_id is null) then raise exception 'unmatched_free_text_lost'; end if;
end $$;
select 'PASS: person and enterprise text resolve teams, ambiguous names never auto-join, submitted source persists through approval and roster';

select 'PASS: membership submission, encrypted ID, access checks, duplicate guards, approval, team linkage, directory privacy, original date, needs-info and rejection';
rollback;
