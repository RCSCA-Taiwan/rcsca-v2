-- Canonical export recovered read-only from Production migration history.
-- Version: 20260921151005; name: v1420_live_network_matching

-- V1420: expose only review-approved Network summaries to active members.

create or replace function public.network_list_matchable_requests()
returns table (
  id uuid,
  title text,
  request_kind text,
  status text,
  public_summary text,
  requester_enterprise_id uuid,
  requester_user_id uuid,
  created_at timestamptz,
  is_owner boolean,
  has_responded boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null then
    raise exception 'authentication_required';
  end if;
  if not public.is_active_member(v_actor) then
    raise exception 'active_membership_required';
  end if;

  return query
  select
    n.id,
    n.title,
    n.request_kind,
    n.status::text,
    n.public_summary,
    n.requester_enterprise_id,
    n.requester_user_id,
    n.created_at,
    n.requester_user_id = v_actor,
    exists (
      select 1
      from public.network_match_responses response
      where response.request_id = n.id
        and response.responder_user_id = v_actor
    )
  from public.network_requests n
  where
    n.requester_user_id = v_actor
    or exists (
      select 1
      from public.network_match_responses response
      where response.request_id = n.id
        and response.responder_user_id = v_actor
    )
    or n.status in ('approved', 'matched')
  order by n.created_at desc;
end;
$$;

revoke all on function public.network_list_matchable_requests() from public, anon;
grant execute on function public.network_list_matchable_requests() to authenticated;

create or replace function public.network_submit_response(
  p_request_id uuid,
  p_message text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_id uuid;
  v_req public.network_requests%rowtype;
  v_enterprise uuid;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  if not public.is_active_member(v_actor) then raise exception 'active_membership_required'; end if;
  if char_length(trim(coalesce(p_message, ''))) < 2 then raise exception 'message_required'; end if;

  select * into v_req
  from public.network_requests
  where id = p_request_id;

  if not found
    or v_req.requester_user_id = v_actor
    or v_req.status not in ('approved', 'matched')
  then
    raise exception 'request_not_available';
  end if;

  select enterprise_id into v_enterprise
  from public.enterprise_users
  where user_id = v_actor
  order by created_at asc
  limit 1;

  insert into public.network_match_responses(
    request_id,
    responder_user_id,
    responder_enterprise_id,
    message,
    status,
    contact_exchange_allowed
  ) values (
    p_request_id,
    v_actor,
    v_enterprise,
    trim(p_message),
    'submitted',
    false
  ) returning id into v_id;

  insert into public.audit_logs(
    actor_user_id,
    actor_role,
    action,
    subject_type,
    subject_id,
    note
  ) values (
    v_actor,
    'member',
    'submit_network_response',
    'network_match_response',
    v_id::text,
    '會員回應已核准的 Network 媒合需求'
  );

  return v_id;
end;
$$;

revoke all on function public.network_submit_response(uuid, text) from public, anon;
grant execute on function public.network_submit_response(uuid, text) to authenticated;
