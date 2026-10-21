-- Refresh the existing member-facing support-case notification instead of
-- inserting a duplicate for each case-manager update. Case history remains
-- append-only, and internal notes remain private support_case_events rows.

create or replace function public.admin_update_support_case(
  p_case_id uuid,
  p_status public.review_status,
  p_owner_note text,
  p_internal_note text default null,
  p_assigned_to uuid default null
) returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid:=auth.uid();
  v_case public.support_cases%rowtype;
  v_event_type text;
begin
  if v_actor is null or not private.is_admin('case_manager') then
    raise exception 'insufficient_privilege';
  end if;

  select * into v_case
  from public.support_cases
  where id=p_case_id
  for update;
  if not found then raise exception 'case_not_found'; end if;
  if p_status is null then raise exception 'status_required'; end if;

  v_event_type:=case
    when p_status='needs_info' then 'needs_info'
    when p_status='completed' then 'completed'
    when p_status='rejected' then 'rejected'
    else 'status_changed'
  end;

  update public.support_cases
  set status=p_status,
      assigned_to=coalesce(p_assigned_to,assigned_to),
      updated_at=now()
  where id=p_case_id;

  if nullif(trim(p_owner_note),'') is not null then
    insert into public.support_case_events(case_id,event_type,status,note,visible_to_owner,created_by)
    values(p_case_id,v_event_type,p_status,trim(p_owner_note),true,v_actor);
  end if;

  if nullif(trim(p_internal_note),'') is not null then
    insert into public.support_case_events(case_id,event_type,status,note,visible_to_owner,created_by)
    values(p_case_id,'internal_note',p_status,trim(p_internal_note),false,v_actor);
  end if;

  if v_case.owner_user_id is not null then
    insert into public.user_notifications(
      recipient_user_id,kind,title,body,related_type,related_id,read_at,created_at
    ) values (
      v_case.owner_user_id,
      'support_case_update',
      '關懷需求進度已更新',
      coalesce(nullif(trim(p_owner_note),''),'案件狀態已更新。'),
      'support_case',
      p_case_id,
      null,
      now()
    )
    on conflict (recipient_user_id,kind,related_type,related_id)
      where related_id is not null
    do update set
      title=excluded.title,
      body=excluded.body,
      read_at=null,
      created_at=excluded.created_at;
  end if;

  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'case_manager','support_case_updated','support_case',p_case_id::text,'狀態：'||p_status::text);
end;
$$;

revoke all on function public.admin_update_support_case(uuid,public.review_status,text,text,uuid) from public,anon;
grant execute on function public.admin_update_support_case(uuid,public.review_status,text,text,uuid) to authenticated;
