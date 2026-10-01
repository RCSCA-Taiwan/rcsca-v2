begin;
select set_config('rcsca.test_member_id', :'member_id', true);
do $$ begin
 if not exists(select 1 from public.profiles where id=current_setting('rcsca.test_member_id')::uuid) then raise exception 'test_profile_missing'; end if;
 if exists(select 1 from public.admin_roles where user_id=current_setting('rcsca.test_member_id')::uuid) then raise exception 'use_unprivileged_test_member'; end if;
end $$;
insert into public.enterprises(tax_id,legal_name,status) values('REPLAY-'||gen_random_uuid(),'Rollback outcome lifecycle','approved') returning set_config('rcsca.test_enterprise',id::text,true);
insert into public.enterprise_users(enterprise_id,user_id,role) values(current_setting('rcsca.test_enterprise')::uuid,current_setting('rcsca.test_member_id')::uuid,'manager');
insert into public.enterprise_service_requests(enterprise_id,requester_user_id,company_name,contact_name,contact_email)
values(current_setting('rcsca.test_enterprise')::uuid,current_setting('rcsca.test_member_id')::uuid,'Rollback outcome lifecycle','Replay','replay@example.invalid') returning set_config('rcsca.test_case',id::text,true);
select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.test_member_id'),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 begin perform public.admin_update_enterprise_service_request(current_setting('rcsca.test_case')::uuid,'completed'); raise exception 'member_case_review_allowed';
 exception when raise_exception then if sqlerrm<>'enterprise_admin_required' then raise; end if; end;
end $$;
reset role;
insert into public.admin_roles(user_id,role_key) values(current_setting('rcsca.test_member_id')::uuid,'enterprise_reviewer');
set local role authenticated;
select public.admin_update_enterprise_service_request(current_setting('rcsca.test_case')::uuid,'under_review',null,'Evaluating');
select public.account_set_notification_read((select id from public.user_notifications where related_id=current_setting('rcsca.test_case')::uuid and kind='enterprise_case'),true);
select public.admin_update_enterprise_service_request(current_setting('rcsca.test_case')::uuid,'completed',null,'Completed and verified');
select public.admin_update_enterprise_service_request(current_setting('rcsca.test_case')::uuid,'completed',null,'Completion confirmed');
do $$ begin
 begin perform public.admin_update_enterprise_service_request(current_setting('rcsca.test_case')::uuid,'under_review'); raise exception 'closed_case_reopened';
 exception when raise_exception then if sqlerrm<>'enterprise_request_closed' then raise; end if; end;
end $$;
select set_config('rcsca.test_queue',(select id::text from public.outcome_review_queue where source_id=current_setting('rcsca.test_case')::uuid),true);
do $$ begin
 if (select count(*) from public.outcome_review_queue where source_id=current_setting('rcsca.test_case')::uuid)<>1 then raise exception 'queue_not_once'; end if;
 begin perform public.admin_generate_outcome_drafts(current_setting('rcsca.test_queue')::uuid); raise exception 'enterprise_role_generated_drafts';
 exception when raise_exception then if sqlerrm<>'outcome_reviewer_required' then raise; end if; end;
end $$;
reset role;
insert into public.admin_roles(user_id,role_key) values(current_setting('rcsca.test_member_id')::uuid,'outcome_reviewer');
set local role authenticated;
select set_config('rcsca.test_drafts',public.admin_generate_outcome_drafts(current_setting('rcsca.test_queue')::uuid)::text,true);
select public.admin_generate_outcome_drafts(current_setting('rcsca.test_queue')::uuid);
select set_config('rcsca.test_asset',(current_setting('rcsca.test_drafts')::jsonb->>'esg_asset_id'),true);
select public.admin_approve_esg_asset(current_setting('rcsca.test_asset')::uuid,'Verified impact','Completed enterprise cooperation','2026');
do $$ begin
 begin perform public.admin_set_esg_evidence_review(current_setting('rcsca.test_asset')::uuid,true); raise exception 'missing_evidence_delivered';
 exception when raise_exception then if sqlerrm<>'esg_evidence_not_delivery_ready' then raise; end if; end;
 begin perform public.admin_update_esg_evidence(current_setting('rcsca.test_asset')::uuid,' '); raise exception 'blank_evidence_saved';
 exception when raise_exception then if sqlerrm<>'evidence_required' then raise; end if; end;
end $$;
select public.admin_update_esg_evidence(current_setting('rcsca.test_asset')::uuid,'Verified case records',array['SDG 1'],'Evidence entered');
select public.admin_set_esg_evidence_review(current_setting('rcsca.test_asset')::uuid,true);
select public.account_set_notification_read((select id from public.user_notifications where related_id=current_setting('rcsca.test_asset')::uuid and kind='esg_report'),true);
select public.admin_set_esg_evidence_review(current_setting('rcsca.test_asset')::uuid,false);
select public.admin_set_esg_evidence_review(current_setting('rcsca.test_asset')::uuid,true);
select public.admin_set_esg_evidence_review(current_setting('rcsca.test_asset')::uuid,true);
select public.admin_update_esg_evidence(current_setting('rcsca.test_asset')::uuid,'Revised verified records',array['SDG 1']);
do $$ begin
 if (select report_ready from public.enterprise_esg_assets where id=current_setting('rcsca.test_asset')::uuid) then raise exception 'edited_evidence_still_deliverable'; end if;
end $$;
select public.admin_set_esg_evidence_review(current_setting('rcsca.test_asset')::uuid,true);
reset role;
do $$ begin
 if (select count(*) from public.cycle_stories where source_id=current_setting('rcsca.test_case')::uuid)<>1 or (select count(*) from public.enterprise_esg_assets where source_id=current_setting('rcsca.test_case')::uuid)<>1 then raise exception 'duplicate_drafts'; end if;
 if exists(select 1 from public.cycle_stories where source_id=current_setting('rcsca.test_case')::uuid and (status<>'draft' or consent_confirmed)) then raise exception 'story_published_without_review'; end if;
 if not exists(select 1 from public.admin_esg_evidence_workbench where id=current_setting('rcsca.test_asset')::uuid and delivery_ready) then raise exception 'verified_asset_not_deliverable'; end if;
 if (select count(*) from public.user_notifications where related_id=current_setting('rcsca.test_case')::uuid and kind='enterprise_case')<>1 then raise exception 'case_notification_not_once'; end if;
 if (select count(*) from public.user_notifications where related_id=current_setting('rcsca.test_asset')::uuid and kind='esg_report')<>1 then raise exception 'esg_notification_not_once'; end if;
 if not exists(select 1 from public.user_notifications where related_id=current_setting('rcsca.test_asset')::uuid and kind='esg_report' and title='ESG 成果可供報告使用' and read_at is null) then raise exception 'esg_notification_not_refreshed'; end if;
end $$;
delete from public.admin_roles where user_id=current_setting('rcsca.test_member_id')::uuid;
set local role authenticated;
do $$ begin
 begin perform public.admin_update_esg_evidence(current_setting('rcsca.test_asset')::uuid,'Unauthorized change'); raise exception 'member_changed_evidence';
 exception when raise_exception then if sqlerrm<>'outcome_reviewer_required' then raise; end if; end;
end $$;
select 'PASS: case completion queues once, drafts once and stay private, evidence gate, hold/release notification refresh, evidence edits reset delivery, role boundaries; rolled back' as result;
rollback;
