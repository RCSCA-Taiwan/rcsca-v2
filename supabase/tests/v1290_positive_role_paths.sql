-- V1290 positive role-path smoke tests for Staging.
-- All fixtures and mutations are contained in one transaction and rolled back.

begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  'a1290000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'v1290-member@example.invalid', '', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"V1290 member"}'::jsonb, now(), now()
);

insert into public.admin_roles(user_id, role_key)
values ('a1290000-0000-4000-8000-000000000001', 'admin');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"a1290000-0000-4000-8000-000000000001","role":"authenticated","aal":"aal1"}',
  true
);

select public.account_update_basic_profile('V1290 verified member', '0900000000');
select public.account_save_my_one_preferences(array['時間','專業']);

create temporary table v1290_results(key text primary key, value text) on commit drop;

insert into v1290_results values (
  'identity_id',
  public.request_identity_verification('basic', 'v1290-disposable-token')::text
);
insert into v1290_results values (
  'support_case_id',
  public.submit_support_case(array['生活支持'], 'V1290 member', '0900000000', '測試區', 'V1290 rollback-only test')::text
);
insert into v1290_results values (
  'enterprise_application_id',
  public.submit_enterprise_application(
    'V1290 Test Enterprise', 'V1290001', 'V1290 member',
    'v1290-member@example.invalid', '0900000000', '測試區',
    array['專業'], 'consult'
  )::text
);
insert into v1290_results values (
  'service_case_number',
  public.enterprise_submit_service_request(
    'V1290 Test Enterprise', 'V1290 member', 'v1290-member@example.invalid',
    '0900000000', array['ESG 諮詢'], 'V1290 rollback-only test', 'consult'
  )
);
insert into v1290_results
select 'admin_referral_overview', count(*)::text
from public.admin_referral_overview();

reset role;

do $$
begin
  if not exists (
    select 1 from public.profiles
    where id='a1290000-0000-4000-8000-000000000001'
      and display_name='V1290 verified member' and mobile='0900000000'
  ) then raise exception 'profile positive path failed'; end if;

  if not exists (
    select 1 from public.my_one_preferences
    where user_id='a1290000-0000-4000-8000-000000000001'
      and share_modes=array['時間','專業']
  ) then raise exception 'preferences positive path failed'; end if;

  if (select count(*) from v1290_results) <> 5
     or exists (select 1 from v1290_results where value is null or value='')
  then raise exception 'workflow positive path failed'; end if;
end $$;

rollback;

select
  not exists (
    select 1 from auth.users
    where id='a1290000-0000-4000-8000-000000000001'
  ) as rolled_back,
  '7/7'::text as positive_paths;
