-- Keep the original verification evidence privately, outside general audit logs.
alter table private.membership_register add column confirmation_note text;
create or replace function public.admin_membership_confirm_existing(p_user uuid,p_name text,p_member_since date,p_year integer,p_referrer uuid,p_note text)
returns void language plpgsql security definer set search_path='' as $$
declare v_m public.memberships%rowtype; v_year integer:=extract(year from now() at time zone 'Asia/Taipei');
begin
  if auth.uid() is null or not private.is_admin(null) then raise exception 'admin_required'; end if;
  select * into v_m from public.memberships where user_id=p_user for update;
  if not found or v_m.status<>'active' then raise exception 'active_membership_required'; end if;
  if p_year is distinct from v_year or p_member_since is null or p_member_since>(now() at time zone 'Asia/Taipei')::date then raise exception 'invalid_membership_period'; end if;
  if v_m.member_since is not null and p_member_since<>v_m.member_since then raise exception 'original_member_since_required'; end if;
  if coalesce(length(trim(p_name)),0) not between 1 and 100 or coalesce(length(trim(p_note)),0) not between 1 and 1000 then raise exception 'confirmation_required'; end if;
  if p_referrer=p_user or (p_referrer is not null and not exists(select 1 from public.profiles where id=p_referrer)) then raise exception 'invalid_referrer'; end if;
  insert into private.membership_register(user_id,membership_year,membership_type,full_name,member_since,referrer_id,confirmed_by,confirmation_note)
  values(p_user,p_year,v_m.membership_type,trim(p_name),p_member_since,p_referrer,auth.uid(),trim(p_note));
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(auth.uid(),'admin','membership_register_confirmed','membership',v_m.id::text,'確認當年度名冊，原入會日期與歷史資料保留');
end;$$;
