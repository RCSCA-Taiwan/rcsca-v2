begin;
select set_config('rcsca.test_member_id', :'member_id', true);
do $$ begin
  if not exists(select 1 from public.profiles where id=current_setting('rcsca.test_member_id')::uuid) then raise exception 'test_profile_missing'; end if;
  if exists(select 1 from public.admin_roles where user_id=current_setting('rcsca.test_member_id')::uuid) then raise exception 'use_unprivileged_test_member'; end if;
end $$;

insert into public.support_cases(owner_user_id,title,public_summary,private_detail,status)
values(current_setting('rcsca.test_member_id')::uuid,'Rollback support continuity','Synthetic public summary','Synthetic private detail','submitted')
returning set_config('rcsca.test_support_case',id::text,true);

select set_config('request.jwt.claims',json_build_object('sub',current_setting('rcsca.test_member_id'),'role','authenticated')::text,true);
insert into public.admin_roles(user_id,role_key) values(current_setting('rcsca.test_member_id')::uuid,'case_manager');
set local role authenticated;
select public.admin_update_support_case(
  current_setting('rcsca.test_support_case')::uuid,
  'needs_info',
  '請補充第一份資料',
  'INTERNAL-SECRET-FIRST'
);
select public.account_set_notification_read(
  (select id from public.user_notifications
   where recipient_user_id=current_setting('rcsca.test_member_id')::uuid
     and kind='support_case_update'
     and related_type='support_case'
     and related_id=current_setting('rcsca.test_support_case')::uuid),
  true
);
reset role;

-- Exercise the member reply without case-manager visibility, proving internal notes
-- remain hidden by the existing support_case_events RLS policy.
delete from public.admin_roles
where user_id=current_setting('rcsca.test_member_id')::uuid and role_key='case_manager';
set local role authenticated;
select public.owner_reply_support_case(current_setting('rcsca.test_support_case')::uuid,'本人補件回覆');
do $$ begin
  if exists(
    select 1 from public.support_case_events
    where case_id=current_setting('rcsca.test_support_case')::uuid
      and note like 'INTERNAL-SECRET-%'
  ) then raise exception 'owner_can_read_internal_note'; end if;
  if not exists(
    select 1 from public.support_case_events
    where case_id=current_setting('rcsca.test_support_case')::uuid
      and event_type='owner_reply'
      and note='本人補件回覆'
  ) then raise exception 'owner_reply_missing'; end if;
end $$;
reset role;

insert into public.admin_roles(user_id,role_key) values(current_setting('rcsca.test_member_id')::uuid,'case_manager');
set local role authenticated;
select public.admin_update_support_case(
  current_setting('rcsca.test_support_case')::uuid,
  'under_review',
  '補件已收到，案件重新評估中',
  'INTERNAL-SECRET-SECOND'
);
select public.admin_update_support_case(
  current_setting('rcsca.test_support_case')::uuid,
  'completed',
  '案件已完成並結案',
  'INTERNAL-SECRET-CLOSE'
);
reset role;

do $$ begin
  if (select status from public.support_cases where id=current_setting('rcsca.test_support_case')::uuid) <> 'completed' then
    raise exception 'support_case_not_completed';
  end if;
  if (select count(*) from public.support_case_events where case_id=current_setting('rcsca.test_support_case')::uuid and visible_to_owner) <> 4 then
    raise exception 'owner_history_not_append_only';
  end if;
  if (select count(*) from public.support_case_events where case_id=current_setting('rcsca.test_support_case')::uuid and not visible_to_owner) <> 3 then
    raise exception 'internal_history_not_append_only';
  end if;
  if (select count(*) from public.user_notifications
      where recipient_user_id=current_setting('rcsca.test_member_id')::uuid
        and kind='support_case_update'
        and related_type='support_case'
        and related_id=current_setting('rcsca.test_support_case')::uuid) <> 1 then
    raise exception 'support_case_notification_not_reused';
  end if;
  if not exists(
    select 1 from public.user_notifications
    where recipient_user_id=current_setting('rcsca.test_member_id')::uuid
      and kind='support_case_update'
      and related_type='support_case'
      and related_id=current_setting('rcsca.test_support_case')::uuid
      and title='關懷需求進度已更新'
      and body='案件已完成並結案'
      and read_at is null
  ) then raise exception 'support_case_notification_not_refreshed'; end if;
  if exists(
    select 1 from public.user_notifications
    where recipient_user_id=current_setting('rcsca.test_member_id')::uuid
      and related_id=current_setting('rcsca.test_support_case')::uuid
      and (coalesce(title,'') like '%INTERNAL-SECRET-%' or coalesce(body,'') like '%INTERNAL-SECRET-%')
  ) then raise exception 'internal_note_leaked_to_notification'; end if;
  if (select count(*) from public.audit_logs
      where actor_user_id=current_setting('rcsca.test_member_id')::uuid
        and action='support_case_updated'
        and subject_id=current_setting('rcsca.test_support_case')) <> 3 then
    raise exception 'support_case_audit_history_missing';
  end if;
end $$;

select 'PASS: needs-info → owner reply → second admin update → completion; one refreshed notification, full append-only history, internal notes private; rolled back' as result;
rollback;
