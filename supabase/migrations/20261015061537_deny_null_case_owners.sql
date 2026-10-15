-- Deny replies when nullable ownership fields do not establish authorization.
-- Preserve signatures, existing execution grants, and all other behavior.
CREATE OR REPLACE FUNCTION public.owner_reply_support_case(p_case_id uuid, p_message text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_actor uuid:=auth.uid(); v_case public.support_cases%rowtype; v_event uuid;
begin
 if v_actor is null then raise exception 'authentication_required'; end if;
 if nullif(trim(p_message),'') is null then raise exception 'message_required'; end if;
 select * into v_case from public.support_cases where id=p_case_id for update;
 if not found then raise exception 'case_not_found'; end if;
 if v_case.owner_user_id is distinct from v_actor then raise exception 'insufficient_privilege'; end if;
 if v_case.status in ('completed','rejected','cancelled') then raise exception 'case_closed'; end if;
 insert into public.support_case_events(case_id,event_type,status,note,visible_to_owner,created_by)
 values(p_case_id,'owner_reply',v_case.status,trim(p_message),true,v_actor) returning id into v_event;
 update public.support_cases set status=case when status='needs_info' then 'submitted' else status end,updated_at=now() where id=p_case_id;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
 values(v_actor,'requester','support_case_reply','support_case',p_case_id::text,'需求案件補充／回覆');
 return v_event;
end;$function$
;
CREATE OR REPLACE FUNCTION public.enterprise_reply_service_request(p_request_id uuid, p_message text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_actor uuid:=auth.uid(); v_req public.enterprise_service_requests%rowtype; v_event uuid;
begin
 if v_actor is null then raise exception 'authentication_required'; end if;
 if coalesce(trim(p_message),'')='' then raise exception 'message_required'; end if;
 select * into v_req from public.enterprise_service_requests where id=p_request_id for update;
 if not found then raise exception 'request_not_found'; end if;
 if (v_req.requester_user_id=v_actor or (v_req.enterprise_id is not null and private.is_enterprise_user(v_req.enterprise_id))) is not true then raise exception 'insufficient_privilege'; end if;
 if v_req.status in ('completed','rejected','cancelled') then raise exception 'request_closed'; end if;
 insert into public.enterprise_service_request_events(request_id,event_type,status,note,visible_to_enterprise,created_by)
 values(p_request_id,'enterprise_reply',v_req.status,p_message,true,v_actor) returning id into v_event;
 update public.enterprise_service_requests set next_action='企業已補件／回覆，請承辦確認',next_action_due_at=coalesce(next_action_due_at,now()+interval '3 days'),updated_at=now() where id=p_request_id;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(v_actor,'enterprise_user','reply_service_request','enterprise_service_request',p_request_id::text,'企業補件／回覆');
 return v_event;
end;$function$
;

