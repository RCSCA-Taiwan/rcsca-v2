-- V470: formal-member Network request gateway and auditable member matching intake.

create or replace function public.is_active_member(target_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.memberships m
    where m.user_id=target_user
      and m.status='active'
      and m.membership_type in ('annual','lifetime')
  );
$$;
revoke all on function public.is_active_member(uuid) from public,anon;
grant execute on function public.is_active_member(uuid) to authenticated;

create or replace function public.member_submit_network_request(
  p_request_kind text,
  p_title text,
  p_public_summary text,
  p_private_detail text,
  p_requester_enterprise_id uuid default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_id uuid; v_kind text:=trim(coalesce(p_request_kind,''));
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  if not public.is_active_member(v_uid) then raise exception 'active_membership_required'; end if;
  if v_kind='' or trim(coalesce(p_title,''))='' or trim(coalesce(p_private_detail,''))='' then raise exception 'request_content_required'; end if;
  if p_requester_enterprise_id is not null and not public.is_enterprise_user(p_requester_enterprise_id) then
    raise exception 'enterprise_access_required';
  end if;
  insert into public.network_requests(requester_user_id,requester_enterprise_id,request_kind,title,public_summary,private_detail,privacy,status)
  values(v_uid,p_requester_enterprise_id,v_kind,trim(p_title),nullif(trim(coalesce(p_public_summary,'')),''),trim(p_private_detail),'member_only','submitted')
  returning id into v_id;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_uid,'member','member_network_request_submitted','network_request',v_id::text,v_kind);
  return v_id;
end;$$;
revoke all on function public.member_submit_network_request(text,text,text,text,uuid) from public,anon;
grant execute on function public.member_submit_network_request(text,text,text,text,uuid) to authenticated;

create index if not exists idx_memberships_active_member on public.memberships(user_id,status,membership_type);
