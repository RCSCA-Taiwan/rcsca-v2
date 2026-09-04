-- Canonical export recovered read-only from Staging migration history.
-- Version: 20260831155728; name: v480_activity_and_user_progress

-- V480: public activity master workflow + self-service participation cancellation.
-- Keeps activity publishing and verification behind explicit admin actions.

create or replace function public.admin_upsert_activity(
  p_activity_id uuid,
  p_code text,
  p_name text,
  p_category text default 'care',
  p_public_summary text default null,
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_status text default 'draft'
) returns uuid
language plpgsql
security definer
set search_path=public,private
as $$
declare
  v_actor uuid:=auth.uid();
  v_id uuid;
begin
  if v_actor is null or not public.is_admin() then raise exception 'insufficient_privilege'; end if;
  if coalesce(trim(p_code),'')='' or coalesce(trim(p_name),'')='' then raise exception 'code_and_name_required'; end if;
  if p_status not in ('draft','published','active','completed','cancelled') then raise exception 'invalid_activity_status'; end if;
  if p_activity_id is null then
    insert into public.activities(code,name,category,public_summary,starts_at,ends_at,status)
    values(trim(p_code),trim(p_name),coalesce(nullif(trim(p_category),''),'care'),nullif(trim(p_public_summary),''),p_starts_at,p_ends_at,p_status)
    returning id into v_id;
  else
    update public.activities set
      code=trim(p_code),name=trim(p_name),category=coalesce(nullif(trim(p_category),''),'care'),
      public_summary=nullif(trim(p_public_summary),''),starts_at=p_starts_at,ends_at=p_ends_at,status=p_status
    where id=p_activity_id returning id into v_id;
    if v_id is null then raise exception 'activity_not_found'; end if;
  end if;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'admin',case when p_activity_id is null then 'create_activity' else 'update_activity' end,'activity',v_id::text,p_status);
  return v_id;
end;$$;
revoke all on function public.admin_upsert_activity(uuid,text,text,text,text,timestamptz,timestamptz,text) from public,anon;
grant execute on function public.admin_upsert_activity(uuid,text,text,text,text,timestamptz,timestamptz,text) to authenticated;

create or replace function public.cancel_my_activity_participation(p_participation_id uuid) returns void
language plpgsql
security definer
set search_path=public
as $$
declare v_actor uuid:=auth.uid();
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  delete from public.activity_participations
  where id=p_participation_id and user_id=v_actor and status='pending';
  if not found then raise exception 'participation_not_cancellable'; end if;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'member','cancel_activity_participation','activity_participation',p_participation_id::text,'會員於核實前取消參與登記');
end;$$;
revoke all on function public.cancel_my_activity_participation(uuid) from public,anon;
grant execute on function public.cancel_my_activity_participation(uuid) to authenticated;

create index if not exists idx_activities_status_dates on public.activities(status,starts_at,ends_at);
