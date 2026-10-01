-- Canonical export recovered from Production migration history.
-- Version: 20261001083600; name: v1471_enterprise_review_permissions

CREATE OR REPLACE FUNCTION public.admin_review_enterprise_application(p_application_id uuid, p_decision review_status, p_note text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare v_application public.enterprise_applications%rowtype; v_actor uuid:=auth.uid(); v_enterprise uuid;
begin
  if not (private.is_admin('enterprise_reviewer') or private.is_admin('admin')) then raise exception 'admin_required'; end if;
  if p_decision not in ('approved','needs_info','rejected') then raise exception 'invalid_decision'; end if;
  select * into v_application from public.enterprise_applications where id=p_application_id for update;
  if not found then raise exception 'application_not_found'; end if;
  if v_application.status not in ('submitted','needs_info') then raise exception 'invalid_status_transition'; end if;
  if p_decision='needs_info' and nullif(trim(coalesce(p_note,'')),'') is null then raise exception 'note_required'; end if;
  v_enterprise:=v_application.enterprise_id;
  if p_decision='approved' then
    if v_enterprise is null then
      insert into public.enterprises(tax_id,legal_name,display_name,region,status)
      values(v_application.tax_id,v_application.company_name,v_application.company_name,v_application.region,'approved')
      on conflict(tax_id) do update set status='approved',updated_at=now()
      returning id into v_enterprise;
    else
      update public.enterprises set status='approved',updated_at=now() where id=v_enterprise;
    end if;
    insert into public.enterprise_users(enterprise_id,user_id,role)
    values(v_enterprise,v_application.requester_user_id,'manager')
    on conflict(enterprise_id,user_id) do nothing;
  end if;
  update public.enterprise_applications
  set enterprise_id=v_enterprise,status=p_decision,review_note=nullif(trim(p_note),''),updated_at=now()
  where id=p_application_id;
  insert into public.user_notifications(recipient_user_id,kind,title,body,related_type,related_id)
  values(
    v_application.requester_user_id,'enterprise_application','企業加入申請已更新',
    case p_decision when 'approved' then '企業身份已核准並連結到你的帳號。'
      when 'needs_info' then 'RCSCA 需要你補充企業申請資料。'
      else '本次企業加入申請未通過。' end,
    'enterprise_application',p_application_id
  )
  on conflict (recipient_user_id,kind,related_type,related_id) where related_id is not null
  do update set title=excluded.title,body=excluded.body,read_at=null,created_at=now();
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'admin','enterprise_application_'||p_decision::text,'enterprise_application',p_application_id::text,p_note);
  return v_enterprise;
end;$function$;
