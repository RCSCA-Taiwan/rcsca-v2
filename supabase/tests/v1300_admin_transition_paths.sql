-- V1300 fixture-heavy admin/member transition smoke tests for Staging.
-- Every fixture and mutation is rolled back.

begin;

insert into auth.users (
  id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at
) values
('a1300000-0000-4000-8000-000000000001','authenticated','authenticated','v1300-admin@example.invalid','',now(),'{}','{}',now(),now()),
('a1300000-0000-4000-8000-000000000002','authenticated','authenticated','v1300-requester@example.invalid','',now(),'{}','{}',now(),now()),
('a1300000-0000-4000-8000-000000000003','authenticated','authenticated','v1300-responder@example.invalid','',now(),'{}','{}',now(),now());

insert into public.admin_roles(user_id,role_key)
values ('a1300000-0000-4000-8000-000000000001','super_admin');

insert into public.enterprises(id,tax_id,legal_name,display_name,status)
values ('e1300000-0000-4000-8000-000000000001','V1300001','V1300 Test Enterprise','V1300 Test','approved');

insert into public.enterprise_users(enterprise_id,user_id,role)
values ('e1300000-0000-4000-8000-000000000001','a1300000-0000-4000-8000-000000000002','manager');

insert into public.enterprise_badges(id,enterprise_id,year,badge_label,status)
values (
  'b1300000-0000-4000-8000-000000000003',
  'e1300000-0000-4000-8000-000000000001',2025,'V1300 OLD','issued'
);

insert into public.enterprise_service_requests(
  id,case_number,enterprise_id,requester_user_id,company_name,contact_name,
  contact_email,needs,service_tier,status,next_action_due_at
) values (
  'e1300000-0000-4000-8000-000000000002','V1300-CASE',
  'e1300000-0000-4000-8000-000000000001','a1300000-0000-4000-8000-000000000002',
  'V1300 Test Enterprise','V1300 requester','v1300-requester@example.invalid',
  array['ESG'], 'consult','submitted',now()-interval '1 day'
);

insert into public.outcome_review_queue(
  id,source_type,source_id,enterprise_id,proposed_story,proposed_esg_asset,status
) values (
  '01300000-0000-4000-8000-000000000001','v1300_fixture',
  '01300000-0000-4000-8000-000000000002','e1300000-0000-4000-8000-000000000001',
  true,true,'submitted'
);

insert into public.cycle_stories(
  id,title,summary,source_type,source_id,status,created_by
) values (
  'c1300000-0000-4000-8000-000000000001','V1300 draft','draft',
  'v1300_direct','c1300000-0000-4000-8000-000000000002','draft',
  'a1300000-0000-4000-8000-000000000001'
);

insert into public.enterprise_esg_assets(
  id,enterprise_id,title,asset_type,summary,source_type,source_id,status,created_by
) values (
  'e1300000-0000-4000-8000-000000000003','e1300000-0000-4000-8000-000000000001',
  'V1300 ESG draft','impact_summary','draft','v1300_direct',
  'e1300000-0000-4000-8000-000000000004','draft',
  'a1300000-0000-4000-8000-000000000001'
);

insert into public.network_requests(
  id,requester_user_id,request_kind,title,status
) values
('d1300000-0000-4000-8000-000000000001','a1300000-0000-4000-8000-000000000002','life','V1300 member decision','submitted'),
('d1300000-0000-4000-8000-000000000002','a1300000-0000-4000-8000-000000000002','life','V1300 admin review','submitted');

insert into public.network_match_responses(
  id,request_id,responder_user_id,message,status
) values
('b1300000-0000-4000-8000-000000000001','d1300000-0000-4000-8000-000000000001','a1300000-0000-4000-8000-000000000003','V1300 response','submitted'),
('b1300000-0000-4000-8000-000000000002','d1300000-0000-4000-8000-000000000002','a1300000-0000-4000-8000-000000000003','V1300 admin response','submitted');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"a1300000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',true);

select public.admin_generate_outcome_drafts(
  '01300000-0000-4000-8000-000000000001','V1300 generated story','Generated story',
  'V1300 generated ESG','Generated ESG'
);
select public.admin_publish_cycle_story(
  'c1300000-0000-4000-8000-000000000001','V1300 published','Published summary',true,true,'V1300 test'
);
select public.admin_approve_esg_asset(
  'e1300000-0000-4000-8000-000000000003','V1300 approved ESG','Approved summary','2026','V1300 test'
);
select public.admin_update_enterprise_service_request(
  'e1300000-0000-4000-8000-000000000002','under_review',
  'a1300000-0000-4000-8000-000000000001','Review started','Follow up',now()-interval '1 hour',true
);
select public.admin_mark_case_due_reminder('e1300000-0000-4000-8000-000000000002');
select public.admin_review_network_response(
  'b1300000-0000-4000-8000-000000000002','approved','V1300 approved'
);
select public.admin_issue_enterprise_badge(
  'e1300000-0000-4000-8000-000000000001',2026,'V1300 PARTNER',null
);
select public.admin_revoke_enterprise_badge(
  'b1300000-0000-4000-8000-000000000003','V1300 rollback-only revoke'
);

select set_config('request.jwt.claims','{"sub":"a1300000-0000-4000-8000-000000000002","role":"authenticated","aal":"aal1"}',true);
select public.decide_network_response('b1300000-0000-4000-8000-000000000001','matched');

reset role;

do $$
begin
  if (select status from public.outcome_review_queue where id='01300000-0000-4000-8000-000000000001') <> 'under_review'
    then raise exception 'outcome queue transition failed'; end if;
  if not exists(select 1 from public.cycle_stories where source_type='v1300_fixture' and status='draft')
    then raise exception 'generated story missing'; end if;
  if not exists(select 1 from public.enterprise_esg_assets where source_type='v1300_fixture' and status='draft')
    then raise exception 'generated ESG asset missing'; end if;
  if (select status from public.cycle_stories where id='c1300000-0000-4000-8000-000000000001') <> 'approved'
    then raise exception 'story publish failed'; end if;
  if (select status from public.enterprise_esg_assets where id='e1300000-0000-4000-8000-000000000003') <> 'approved'
    then raise exception 'ESG approval failed'; end if;
  if not exists(select 1 from public.enterprise_service_requests where id='e1300000-0000-4000-8000-000000000002' and status='under_review' and last_due_reminder_at is not null)
    then raise exception 'enterprise request transition failed'; end if;
  if not exists(select 1 from public.network_match_responses where id='b1300000-0000-4000-8000-000000000001' and status='matched')
    then raise exception 'member network decision failed'; end if;
  if not exists(select 1 from public.network_match_responses where id='b1300000-0000-4000-8000-000000000002' and status='approved' and reviewed_by='a1300000-0000-4000-8000-000000000001')
    then raise exception 'admin network review failed'; end if;
  if not exists(select 1 from public.enterprise_badges where enterprise_id='e1300000-0000-4000-8000-000000000001' and year=2026 and status='issued')
    then raise exception 'enterprise badge issue failed'; end if;
  if not exists(select 1 from public.enterprise_badges where id='b1300000-0000-4000-8000-000000000003' and status='revoked')
    then raise exception 'enterprise badge revoke failed'; end if;
end $$;

rollback;

select
  not exists(select 1 from auth.users where id='a1300000-0000-4000-8000-000000000001') rolled_back,
  '9/9'::text transition_paths;
