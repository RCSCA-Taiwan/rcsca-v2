-- V490: enterprise resubmission + bilateral Network response decisions.

create or replace function public.enterprise_resubmit_share(
  p_share_id uuid,
  p_title text,
  p_description text default null,
  p_share_type public.share_type default null
) returns void
language plpgsql security definer set search_path=public,private as $$
declare v_actor uuid:=auth.uid(); v_share public.enterprise_shares%rowtype;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  select * into v_share from public.enterprise_shares where id=p_share_id for update;
  if not found or not private.is_enterprise_user(v_share.enterprise_id) then raise exception 'insufficient_privilege'; end if;
  if v_share.status <> 'needs_info' then raise exception 'share_not_waiting_for_info'; end if;
  if nullif(trim(p_title),'') is null then raise exception 'title_required'; end if;
  update public.enterprise_shares set title=trim(p_title),description=nullif(trim(p_description),''),share_type=coalesce(p_share_type,share_type),status='submitted',public_result=false where id=p_share_id;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'enterprise','resubmit_enterprise_share','enterprise_share',p_share_id::text,'企業補件後重新送審');
end;$$;
revoke all on function public.enterprise_resubmit_share(uuid,text,text,public.share_type) from public,anon;
grant execute on function public.enterprise_resubmit_share(uuid,text,text,public.share_type) to authenticated;

create or replace function public.decide_network_response(p_response_id uuid,p_decision text)
returns void language plpgsql security definer set search_path=public,private as $$
declare v_actor uuid:=auth.uid(); v_resp public.network_match_responses%rowtype; v_req public.network_requests%rowtype; v_status public.review_status;
begin
 if v_actor is null then raise exception 'authentication_required'; end if;
 if p_decision not in ('matched','rejected','cancelled','completed') then raise exception 'invalid_decision'; end if;
 select * into v_resp from public.network_match_responses where id=p_response_id for update;
 if not found then raise exception 'response_not_found'; end if;
 select * into v_req from public.network_requests where id=v_resp.request_id for update;
 if p_decision in ('matched','rejected') and v_req.requester_user_id<>v_actor then raise exception 'requester_only'; end if;
 if p_decision='cancelled' and v_resp.responder_user_id<>v_actor then raise exception 'responder_only'; end if;
 if p_decision='completed' and v_actor not in (v_req.requester_user_id,v_resp.responder_user_id) then raise exception 'participant_only'; end if;
 v_status:=p_decision::public.review_status;
 update public.network_match_responses set status=v_status,updated_at=now() where id=p_response_id;
 if p_decision='matched' then update public.network_requests set status='matched',updated_at=now() where id=v_req.id;
 elsif p_decision='completed' then update public.network_requests set status='completed',updated_at=now() where id=v_req.id;
 end if;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(v_actor,'member','decide_network_response','network_match_response',p_response_id::text,p_decision);
 insert into public.user_notifications(recipient_user_id,kind,title,body,related_type,related_id)
 values(case when v_actor=v_req.requester_user_id then v_resp.responder_user_id else v_req.requester_user_id end,'network_response_update','1% Network 媒合狀態已更新','請進入我的媒合查看最新進度。','network_response',p_response_id);
end;$$;
revoke all on function public.decide_network_response(uuid,text) from public,anon;
grant execute on function public.decide_network_response(uuid,text) to authenticated;
