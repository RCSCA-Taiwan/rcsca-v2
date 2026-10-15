-- Legacy membership enums also contain pending/inactive values; never treat them as formal membership.
create or replace function public.membership_referrers()
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.display_name,'teams',
    coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'name',t.name) order by t.name)
      from public.team_members tm join public.teams t on t.id=tm.team_id and t.is_active
      where tm.user_id=p.id and tm.left_at is null),'[]'::jsonb)) order by p.display_name)
    from public.profiles p join public.memberships m on m.user_id=p.id
    where m.status='active' and m.membership_type in ('annual','lifetime') and p.is_active and nullif(trim(p.display_name),'') is not null and p.id<>auth.uid()),'[]'::jsonb);
end;$$;

create or replace function public.membership_submit(p_kind text,p_type public.membership_type,p_name text,p_identity text,
  p_phone text,p_email text,p_address text,p_referrer uuid,p_team uuid,p_join_team boolean,p_consent boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_id uuid; v_secret uuid; v_identity text:=upper(trim(p_identity)); v_code integer; v_sum integer; v_i integer;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  perform 1 from public.profiles where id=v_actor for no key update;
  if p_consent is distinct from true then raise exception 'consent_required'; end if;
  if p_kind is null or p_kind not in ('new','renewal') or (p_type is null or p_type not in ('annual','lifetime')) then raise exception 'invalid_application'; end if;
  if coalesce(length(trim(p_name)),0) not between 1 and 100 or coalesce(length(trim(p_phone)),0) not between 6 and 30
    or coalesce(length(trim(p_address)),0) not between 3 and 500 or coalesce(length(trim(p_email)),0) not between 3 and 254
    or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then raise exception 'invalid_contact'; end if;
  if v_identity is null or v_identity !~ '^[A-Z][12][0-9]{8}$' then raise exception 'invalid_identity'; end if;
  v_code:=strpos('ABCDEFGHJKLMNPQRSTUVXYWZIO',left(v_identity,1))+9;
  v_sum:=v_code/10+(v_code%10)*9+right(v_identity,1)::integer;
  for v_i in 2..9 loop v_sum:=v_sum+substr(v_identity,v_i,1)::integer*(10-v_i); end loop;
  if v_sum%10<>0 then raise exception 'invalid_identity'; end if;
  if exists(select 1 from private.membership_applications where user_id=v_actor and status='pending') then raise exception 'application_pending'; end if;
  if p_kind='renewal' and not exists(select 1 from public.memberships where user_id=v_actor) then raise exception 'renewal_membership_not_found'; end if;
  if p_referrer is not null and (p_referrer=v_actor or not exists(select 1 from public.memberships m join public.profiles p on p.id=m.user_id where m.user_id=p_referrer and m.status='active' and m.membership_type in ('annual','lifetime') and p.is_active)) then raise exception 'invalid_referrer'; end if;
  if p_team is not null and (p_referrer is null or not exists(select 1 from public.team_members tm join public.teams t on t.id=tm.team_id and t.is_active where tm.user_id=p_referrer and tm.team_id=p_team and tm.left_at is null)) then raise exception 'invalid_referrer_team'; end if;
  if p_join_team is true and p_team is null then raise exception 'team_required'; end if;
  -- Vault encrypts each identity with a key managed outside database backups.
  select vault.create_secret(v_identity) into v_secret;
  insert into private.membership_applications(user_id,application_kind,membership_type,full_name,identity_secret_id,identity_mask,phone,email,address,referrer_id,proposed_team_id,join_team_consent)
  values(v_actor,p_kind,p_type,trim(p_name),v_secret,left(v_identity,1)||'******'||right(v_identity,3),trim(p_phone),trim(p_email),trim(p_address),p_referrer,p_team,coalesce(p_join_team,false)) returning id into v_id;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'user','membership_submitted','membership_application',v_id::text,'會員入會或續會申請；資料使用同意版本 2026-10-16');
  return v_id;
end;$$;

create or replace function public.membership_directory(p_year integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_year integer:=extract(year from now() at time zone 'Asia/Taipei');
begin
  if auth.uid() is null or not (private.is_admin(null) or public.is_active_member(auth.uid())) then raise exception 'active_membership_required'; end if;
  if p_year is null or p_year<1900 or p_year>v_year then raise exception 'invalid_year'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'name',r.full_name,'membership_type',r.membership_type,'member_since',r.member_since,'referrer_name',p.display_name,'confirmed_at',r.confirmed_at) order by r.full_name)
    from (select distinct on (user_id) * from private.membership_register
      where membership_year=p_year or (membership_type='lifetime' and membership_year<=p_year)
      order by user_id,membership_year desc) r
    join public.memberships m on m.user_id=r.user_id
    left join public.profiles p on p.id=r.referrer_id
    where p_year<v_year or m.status='active'),'[]'::jsonb);
end;$$;

create or replace function public.admin_membership_confirm_existing(p_user uuid,p_name text,p_member_since date,p_year integer,p_referrer uuid,p_note text)
returns void language plpgsql security definer set search_path='' as $$
declare v_m public.memberships%rowtype; v_year integer:=extract(year from now() at time zone 'Asia/Taipei');
begin
  if auth.uid() is null or not private.is_admin(null) then raise exception 'admin_required'; end if;
  select * into v_m from public.memberships where user_id=p_user for update;
  if not found or v_m.status<>'active' or v_m.membership_type not in ('annual','lifetime') then raise exception 'active_membership_required'; end if;
  if p_year is distinct from v_year or p_member_since is null or p_member_since>(now() at time zone 'Asia/Taipei')::date then raise exception 'invalid_membership_period'; end if;
  if v_m.member_since is not null and p_member_since<>v_m.member_since then raise exception 'original_member_since_required'; end if;
  if coalesce(length(trim(p_name)),0) not between 1 and 100 or coalesce(length(trim(p_note)),0) not between 1 and 1000 then raise exception 'confirmation_required'; end if;
  if p_referrer=p_user or (p_referrer is not null and not exists(select 1 from public.profiles where id=p_referrer)) then raise exception 'invalid_referrer'; end if;
  insert into private.membership_register(user_id,membership_year,membership_type,full_name,member_since,referrer_id,confirmed_by,confirmation_note)
  values(p_user,p_year,v_m.membership_type,trim(p_name),p_member_since,p_referrer,auth.uid(),trim(p_note));
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(auth.uid(),'admin','membership_register_confirmed','membership',v_m.id::text,'確認當年度名冊，原入會日期與歷史資料保留');
end;$$;

