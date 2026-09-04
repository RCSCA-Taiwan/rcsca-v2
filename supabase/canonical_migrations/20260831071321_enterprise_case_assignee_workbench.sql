-- Canonical export recovered read-only from Staging migration history.
-- Version: 20260831071321; name: enterprise_case_assignee_workbench

-- V310: assignee workbench + reply-driven follow-up
create index if not exists idx_enterprise_service_requests_assigned_status_due on public.enterprise_service_requests(assigned_to,status,next_action_due_at);

create or replace view public.enterprise_case_workbench
with (security_invoker=true)
as
select r.id,r.case_number,r.company_name,r.service_tier,r.status,r.assigned_to,r.next_action,r.next_action_due_at,r.updated_at,
 case when r.next_action_due_at is not null and r.next_action_due_at < now() and r.status not in ('completed','rejected','cancelled') then true else false end as is_overdue,
 (select max(e.created_at) from public.enterprise_service_request_events e where e.request_id=r.id and e.event_type='enterprise_reply') as last_enterprise_reply_at
from public.enterprise_service_requests r;

-- When enterprise replies, reopen staff attention without overwriting a completed/closed case.
create or replace function public.enterprise_reply_service_request(p_request_id uuid,p_message text) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_req public.enterprise_service_requests%rowtype; v_event uuid;
begin
 if v_actor is null then raise exception 'authentication_required'; end if;
 if coalesce(trim(p_message),'')='' then raise exception 'message_required'; end if;
 select * into v_req from public.enterprise_service_requests where id=p_request_id for update;
 if not found then raise exception 'request_not_found'; end if;
 if not (v_req.requester_user_id=v_actor or (v_req.enterprise_id is not null and private.is_enterprise_user(v_req.enterprise_id))) then raise exception 'insufficient_privilege'; end if;
 if v_req.status in ('completed','rejected','cancelled') then raise exception 'request_closed'; end if;
 insert into public.enterprise_service_request_events(request_id,event_type,status,note,visible_to_enterprise,created_by)
 values(p_request_id,'enterprise_reply',v_req.status,p_message,true,v_actor) returning id into v_event;
 update public.enterprise_service_requests set next_action='企業已補件／回覆，請承辦確認',next_action_due_at=coalesce(next_action_due_at,now()+interval '3 days'),updated_at=now() where id=p_request_id;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(v_actor,'enterprise_user','reply_service_request','enterprise_service_request',p_request_id::text,'企業補件／回覆');
 return v_event;
end;$$;
revoke all on function public.enterprise_reply_service_request(uuid,text) from public,anon;
grant execute on function public.enterprise_reply_service_request(uuid,text) to authenticated;
