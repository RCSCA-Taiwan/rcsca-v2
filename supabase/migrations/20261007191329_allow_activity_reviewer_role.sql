-- Allow super admins to assign the existing activity reviewer role.
create or replace function public.admin_set_platform_role(p_user_id uuid,p_role_key text,p_enabled boolean)
returns void language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_role text:=lower(trim(p_role_key));
begin
 if v_actor is null or not private.is_admin('super_admin') then raise exception 'super_admin_required'; end if;
 if v_role not in ('admin','case_manager','network_manager','enterprise_reviewer','outcome_reviewer','super_admin','activity_reviewer') then raise exception 'invalid_admin_role'; end if;
 if p_user_id=v_actor and v_role='super_admin' and not p_enabled then raise exception 'cannot_remove_own_super_admin'; end if;
 if p_enabled then
   insert into public.admin_roles(user_id,role_key) values(p_user_id,v_role) on conflict(user_id,role_key) do nothing;
 else
   delete from public.admin_roles where user_id=p_user_id and role_key=v_role;
 end if;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
 values(v_actor,'super_admin',case when p_enabled then 'admin_role_grant' else 'admin_role_revoke' end,'profile',p_user_id::text,v_role);
 insert into public.user_notifications(recipient_user_id,kind,title,body,related_type,related_id)
 values(p_user_id,'admin_role','後台權限已更新','你的 RCSCA 後台角色已更新：'||v_role||'。','profile',p_user_id);
end;$$;

revoke all on function public.admin_set_platform_role(uuid,text,boolean) from public, anon;
grant execute on function public.admin_set_platform_role(uuid,text,boolean) to authenticated;
