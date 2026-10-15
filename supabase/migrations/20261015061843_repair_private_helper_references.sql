-- Replace references to removed public wrappers with private authorization helpers.
CREATE OR REPLACE FUNCTION public.admin_upsert_activity(p_activity_id uuid, p_code text, p_name text, p_category text DEFAULT 'care'::text, p_public_summary text DEFAULT NULL::text, p_starts_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_ends_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_status text DEFAULT 'draft'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare
  v_actor uuid:=auth.uid();
  v_id uuid;
begin
  if v_actor is null or not private.is_admin(null) then raise exception 'insufficient_privilege'; end if;
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
end;$function$
;
CREATE OR REPLACE FUNCTION public.member_submit_network_request(p_request_kind text, p_title text, p_public_summary text, p_private_detail text, p_requester_enterprise_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_uid uuid:=auth.uid(); v_id uuid; v_kind text:=trim(coalesce(p_request_kind,''));
begin
  if v_uid is null then raise exception 'authentication_required'; end if;
  if not public.is_active_member(v_uid) then raise exception 'active_membership_required'; end if;
  if v_kind='' or trim(coalesce(p_title,''))='' or trim(coalesce(p_private_detail,''))='' then raise exception 'request_content_required'; end if;
  if p_requester_enterprise_id is not null and not private.is_enterprise_user(p_requester_enterprise_id) then
    raise exception 'enterprise_access_required';
  end if;
  insert into public.network_requests(requester_user_id,requester_enterprise_id,request_kind,title,public_summary,private_detail,privacy,status)
  values(v_uid,p_requester_enterprise_id,v_kind,trim(p_title),nullif(trim(coalesce(p_public_summary,'')),''),trim(p_private_detail),'member_only','submitted')
  returning id into v_id;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_uid,'member','member_network_request_submitted','network_request',v_id::text,v_kind);
  return v_id;
end;$function$
;

