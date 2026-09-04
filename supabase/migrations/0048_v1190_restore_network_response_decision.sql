-- V1190: restore the participant-facing Network response decision RPC missing from Staging.

create or replace function public.decide_network_response(
  p_response_id uuid,
  p_decision text
) returns void
language plpgsql
security definer
set search_path=public,private
as $$
declare
  v_actor uuid:=auth.uid();
  v_resp public.network_match_responses%rowtype;
  v_req public.network_requests%rowtype;
  v_recipient uuid;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  if p_decision not in ('matched','rejected','cancelled','completed') then
    raise exception 'invalid_decision';
  end if;

  select * into v_resp
  from public.network_match_responses
  where id=p_response_id
  for update;
  if not found then raise exception 'response_not_found'; end if;

  select * into v_req
  from public.network_requests
  where id=v_resp.request_id
  for update;
  if not found then raise exception 'request_not_found'; end if;

  if p_decision in ('matched','rejected') then
    if v_req.requester_user_id<>v_actor then raise exception 'requester_only'; end if;
    if v_resp.status<>'submitted' then raise exception 'invalid_status_transition'; end if;
  elsif p_decision='cancelled' then
    if v_resp.responder_user_id<>v_actor then raise exception 'responder_only'; end if;
    if v_resp.status<>'submitted' then raise exception 'invalid_status_transition'; end if;
  elsif p_decision='completed' then
    if v_actor not in (v_req.requester_user_id,v_resp.responder_user_id) then
      raise exception 'participant_only';
    end if;
    if v_resp.status<>'matched' then raise exception 'invalid_status_transition'; end if;
  end if;

  update public.network_match_responses
  set status=p_decision::public.review_status,updated_at=now()
  where id=p_response_id;

  if p_decision='matched' then
    update public.network_requests
    set status='matched',updated_at=now()
    where id=v_req.id and status not in ('completed','cancelled');
  elsif p_decision='completed' then
    update public.network_requests
    set status='completed',updated_at=now()
    where id=v_req.id;
  end if;

  insert into public.audit_logs(
    actor_user_id,actor_role,action,subject_type,subject_id,note
  ) values(
    v_actor,'member','decide_network_response','network_match_response',
    p_response_id::text,p_decision
  );

  v_recipient:=case
    when v_actor=v_req.requester_user_id then v_resp.responder_user_id
    else v_req.requester_user_id
  end;
  insert into public.user_notifications(
    recipient_user_id,kind,title,body,related_type,related_id
  ) values(
    v_recipient,'network_response_update','1% Network 媒合狀態已更新',
    '請進入我的媒合查看最新進度。','network_response',p_response_id
  );
end;
$$;

revoke all on function public.decide_network_response(uuid,text) from public,anon;
grant execute on function public.decide_network_response(uuid,text) to authenticated;
