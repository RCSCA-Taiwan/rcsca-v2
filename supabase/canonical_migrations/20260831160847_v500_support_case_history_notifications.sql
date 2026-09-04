-- Canonical export recovered read-only from Staging migration history.
-- Version: 20260831160847; name: v500_support_case_history_notifications

-- V500: protected support case timeline + owner replies + admin case management.
create table if not exists public.support_case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.support_cases(id) on delete cascade,
  event_type text not null,
  status public.review_status,
  note text,
  visible_to_owner boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_support_case_events_case_created
  on public.support_case_events(case_id,created_at);
create index if not exists idx_support_cases_status_updated
  on public.support_cases(status,updated_at desc);

alter table public.support_case_events enable row level security;

drop policy if exists "support case events participant read" on public.support_case_events;
create policy "support case events participant read" on public.support_case_events
for select to authenticated using (
  private.is_admin('case_manager')
  or exists (
    select 1 from public.support_cases c
    where c.id=case_id
      and (c.assigned_to=auth.uid() or (c.owner_user_id=auth.uid() and visible_to_owner))
  )
);

create or replace function public.owner_reply_support_case(p_case_id uuid,p_message text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_case public.support_cases%rowtype; v_event uuid;
begin
 if v_actor is null then raise exception 'authentication_required'; end if;
 if nullif(trim(p_message),'') is null then raise exception 'message_required'; end if;
 select * into v_case from public.support_cases where id=p_case_id for update;
 if not found then raise exception 'case_not_found'; end if;
 if v_case.owner_user_id<>v_actor then raise exception 'insufficient_privilege'; end if;
 if v_case.status in ('completed','rejected','cancelled') then raise exception 'case_closed'; end if;
 insert into public.support_case_events(case_id,event_type,status,note,visible_to_owner,created_by)
 values(p_case_id,'owner_reply',v_case.status,trim(p_message),true,v_actor) returning id into v_event;
 update public.support_cases set status=case when status='needs_info' then 'submitted' else status end,updated_at=now() where id=p_case_id;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
 values(v_actor,'requester','support_case_reply','support_case',p_case_id::text,'需求案件補充／回覆');
 return v_event;
end;$$;
revoke all on function public.owner_reply_support_case(uuid,text) from public,anon;
grant execute on function public.owner_reply_support_case(uuid,text) to authenticated;

create or replace function public.admin_update_support_case(
 p_case_id uuid,p_status public.review_status,p_owner_note text,p_internal_note text default null,p_assigned_to uuid default null)
returns void language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_case public.support_cases%rowtype; v_event_type text;
begin
 if v_actor is null or not private.is_admin('case_manager') then raise exception 'insufficient_privilege'; end if;
 select * into v_case from public.support_cases where id=p_case_id for update;
 if not found then raise exception 'case_not_found'; end if;
 if p_status is null then raise exception 'status_required'; end if;
 v_event_type:=case when p_status='needs_info' then 'needs_info' when p_status='completed' then 'completed' when p_status='rejected' then 'rejected' else 'status_changed' end;
 update public.support_cases set status=p_status,assigned_to=coalesce(p_assigned_to,assigned_to),updated_at=now() where id=p_case_id;
 if nullif(trim(p_owner_note),'') is not null then
   insert into public.support_case_events(case_id,event_type,status,note,visible_to_owner,created_by)
   values(p_case_id,v_event_type,p_status,trim(p_owner_note),true,v_actor);
 end if;
 if nullif(trim(p_internal_note),'') is not null then
   insert into public.support_case_events(case_id,event_type,status,note,visible_to_owner,created_by)
   values(p_case_id,'internal_note',p_status,trim(p_internal_note),false,v_actor);
 end if;
 if v_case.owner_user_id is not null then
   insert into public.user_notifications(recipient_user_id,kind,title,body,related_type,related_id)
   values(v_case.owner_user_id,'support_case_update','關懷需求進度已更新',coalesce(nullif(trim(p_owner_note),''),'案件狀態已更新。'),'support_case',p_case_id);
 end if;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
 values(v_actor,'case_manager','support_case_updated','support_case',p_case_id::text,'狀態：'||p_status::text);
end;$$;
revoke all on function public.admin_update_support_case(uuid,public.review_status,text,text,uuid) from public,anon;
grant execute on function public.admin_update_support_case(uuid,public.review_status,text,text,uuid) to authenticated;

insert into public.support_case_events(case_id,event_type,status,note,visible_to_owner,created_by,created_at)
select c.id,'created',c.status,'需求已送出，RCSCA 將依資料完整度與實際資源進行評估。',true,c.owner_user_id,c.created_at
from public.support_cases c
where not exists(select 1 from public.support_case_events e where e.case_id=c.id);
