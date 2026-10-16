-- All roster confirmation paths preserve the earliest verified admission date.
create function private.confirm_existing_membership_guarded(p_user uuid,p_name text,p_member_since date,p_year integer,p_referrer uuid,p_note text)
returns void language plpgsql security definer set search_path='' as $$
declare v_original date;v_m public.memberships%rowtype; v_year integer:=extract(year from now() at time zone 'Asia/Taipei');
begin
  if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required'; end if;
  select * into v_m from public.memberships where user_id=p_user for update;
  if not found or v_m.status<>'active' or v_m.membership_type not in ('annual','lifetime') then raise exception 'active_membership_required'; end if;
  if p_year is distinct from v_year or p_member_since is null or p_member_since<'1900-01-01'::date or p_member_since>(now() at time zone 'Asia/Taipei')::date then raise exception 'invalid_membership_period'; end if;
  select coalesce(min(member_since),v_m.member_since) into v_original from private.membership_register where user_id=p_user;
  if (v_original is not null and p_member_since<>v_original) or (v_original is not null and v_m.member_since is not null and v_original<>v_m.member_since) then raise exception 'original_member_since_required';end if;
  if coalesce(length(trim(p_name)),0) not between 1 and 100 or coalesce(length(trim(p_note)),0) not between 1 and 1000 then raise exception 'confirmation_required'; end if;
  if p_referrer=p_user or (p_referrer is not null and not exists(select 1 from public.profiles where id=p_referrer)) then raise exception 'invalid_referrer'; end if;
  update public.memberships set member_since=p_member_since,updated_at=now() where user_id=p_user and member_since is null;
  insert into private.membership_register(user_id,membership_year,membership_type,full_name,member_since,referrer_id,confirmed_by,confirmation_note)
  values(p_user,p_year,v_m.membership_type,trim(p_name),p_member_since,p_referrer,auth.uid(),trim(p_note));
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(auth.uid(),'admin','membership_register_confirmed','membership',v_m.id::text,'確認當年度名冊，原入會日期與歷史資料保留');
end;$$;
revoke all on function private.confirm_existing_membership_guarded(uuid,text,date,integer,uuid,text) from public,anon;
grant execute on function private.confirm_existing_membership_guarded(uuid,text,date,integer,uuid,text) to authenticated;
create or replace function public.admin_membership_confirm_existing(p_user uuid,p_name text,p_member_since date,p_year integer,p_referrer uuid,p_note text)
returns void language sql security invoker set search_path='' as $$select private.confirm_existing_membership_guarded(p_user,p_name,p_member_since,p_year,p_referrer,p_note);$$;
revoke all on function public.admin_membership_confirm_existing(uuid,text,date,integer,uuid,text) from public,anon;
grant execute on function public.admin_membership_confirm_existing(uuid,text,date,integer,uuid,text) to authenticated;
