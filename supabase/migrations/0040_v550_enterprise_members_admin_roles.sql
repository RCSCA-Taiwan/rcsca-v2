-- V550: enterprise member governance + admin role governance

create or replace function public.is_enterprise_manager(target uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(
    select 1 from public.enterprise_users eu
    where eu.enterprise_id=target and eu.user_id=auth.uid() and eu.role='manager'
  );
$$;

-- Allow enterprise teammates to see who is on their own enterprise only.
create or replace function private.is_same_enterprise_user(target uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.enterprise_users eu where eu.enterprise_id=target and eu.user_id=auth.uid());
$$;

drop policy if exists "enterprise users own enterprise" on public.enterprise_users;
drop policy if exists "enterprise users same enterprise" on public.enterprise_users;
create policy "enterprise users same enterprise" on public.enterprise_users for select using (
  user_id=auth.uid() or private.is_admin(null) or private.is_same_enterprise_user(enterprise_id)
);

create or replace function public.enterprise_add_member_by_email(p_enterprise_id uuid,p_email text,p_role text default 'viewer')
returns uuid language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_user uuid; v_id uuid; v_role text:=lower(trim(coalesce(p_role,'viewer')));
begin
 if v_actor is null then raise exception 'authentication_required'; end if;
 if not public.is_enterprise_manager(p_enterprise_id) and not private.is_admin(null) then raise exception 'manager_required'; end if;
 if v_role not in ('manager','editor','viewer') then raise exception 'invalid_enterprise_role'; end if;
 select id into v_user from public.profiles where lower(email)=lower(trim(p_email)) limit 1;
 if v_user is null then raise exception 'registered_account_not_found'; end if;
 insert into public.enterprise_users(enterprise_id,user_id,role)
 values(p_enterprise_id,v_user,v_role)
 on conflict(enterprise_id,user_id) do update set role=excluded.role
 returning id into v_id;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
 values(v_actor,'enterprise_manager','enterprise_member_upsert','enterprise_user',v_id::text,'企業成員角色：'||v_role);
 insert into public.user_notifications(recipient_user_id,kind,title,body,related_type,related_id)
 values(v_user,'enterprise_member','企業帳號權限已更新','你已加入企業管理團隊，角色為 '||v_role||'。','enterprise',p_enterprise_id);
 return v_id;
end;$$;
revoke all on function public.enterprise_add_member_by_email(uuid,text,text) from public,anon;
grant execute on function public.enterprise_add_member_by_email(uuid,text,text) to authenticated;

create or replace function public.enterprise_remove_member(p_enterprise_id uuid,p_user_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_target_role text; v_manager_count int;
begin
 if v_actor is null then raise exception 'authentication_required'; end if;
 if not public.is_enterprise_manager(p_enterprise_id) and not private.is_admin(null) then raise exception 'manager_required'; end if;
 select role into v_target_role from public.enterprise_users where enterprise_id=p_enterprise_id and user_id=p_user_id;
 if v_target_role is null then raise exception 'enterprise_member_not_found'; end if;
 if v_target_role='manager' then
   select count(*) into v_manager_count from public.enterprise_users where enterprise_id=p_enterprise_id and role='manager';
   if v_manager_count<=1 then raise exception 'last_manager_cannot_be_removed'; end if;
 end if;
 delete from public.enterprise_users where enterprise_id=p_enterprise_id and user_id=p_user_id;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
 values(v_actor,'enterprise_manager','enterprise_member_remove','enterprise',p_enterprise_id::text,'移除企業成員：'||p_user_id::text);
 insert into public.user_notifications(recipient_user_id,kind,title,body,related_type,related_id)
 values(p_user_id,'enterprise_member','企業帳號權限已移除','你的企業管理權限已移除。','enterprise',p_enterprise_id);
end;$$;
revoke all on function public.enterprise_remove_member(uuid,uuid) from public,anon;
grant execute on function public.enterprise_remove_member(uuid,uuid) to authenticated;

create or replace function public.admin_set_platform_role(p_user_id uuid,p_role_key text,p_enabled boolean)
returns void language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_role text:=lower(trim(p_role_key));
begin
 if v_actor is null or not private.is_admin('super_admin') then raise exception 'super_admin_required'; end if;
 if v_role not in ('admin','case_manager','network_manager','enterprise_reviewer','outcome_reviewer','super_admin') then raise exception 'invalid_admin_role'; end if;
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
revoke all on function public.admin_set_platform_role(uuid,text,boolean) from public,anon;
grant execute on function public.admin_set_platform_role(uuid,text,boolean) to authenticated;

create index if not exists idx_enterprise_users_enterprise_role on public.enterprise_users(enterprise_id,role,user_id);
create index if not exists idx_admin_roles_role_user on public.admin_roles(role_key,user_id);
