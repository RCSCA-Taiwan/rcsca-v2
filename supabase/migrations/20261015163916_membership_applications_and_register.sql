-- Applications are separate from platform registration. No raw ID or contact data in the directory.
create table private.membership_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  application_kind text not null check (application_kind in ('new','renewal')),
  membership_type public.membership_type not null,
  full_name text not null check (length(full_name) between 1 and 100),
  identity_secret_id uuid not null references vault.secrets(id),
  identity_mask text not null,
  phone text not null, email text not null, address text not null,
  referrer_id uuid references public.profiles(id),
  proposed_team_id uuid references public.teams(id),
  join_team_consent boolean not null default false,
  consent_version text not null default '2026-10-16',
  status text not null default 'pending' check (status in ('pending','needs_info','approved','rejected')),
  review_note text, reviewed_by uuid references public.profiles(id), reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index membership_one_open_application on private.membership_applications(user_id) where status='pending';
alter table private.membership_applications enable row level security;
revoke all on private.membership_applications from public,anon,authenticated;

create table private.membership_register (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  membership_year integer not null check (membership_year between 1900 and 2200),
  membership_type public.membership_type not null,
  full_name text not null,
  member_since date not null,
  referrer_id uuid references public.profiles(id),
  application_id uuid unique references private.membership_applications(id),
  confirmed_by uuid not null references public.profiles(id),
  confirmed_at timestamptz not null default now(),
  unique(user_id,membership_year)
);
alter table private.membership_register enable row level security;
revoke all on private.membership_register from public,anon,authenticated;

create function public.membership_referrers()
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.display_name,'teams',
    coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'name',t.name) order by t.name)
      from public.team_members tm join public.teams t on t.id=tm.team_id and t.is_active
      where tm.user_id=p.id and tm.left_at is null),'[]'::jsonb)) order by p.display_name)
    from public.profiles p join public.memberships m on m.user_id=p.id
    where m.status='active' and p.is_active and nullif(trim(p.display_name),'') is not null and p.id<>auth.uid()),'[]'::jsonb);
end;$$;

create function public.membership_applications_self()
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  return coalesce((select jsonb_agg(to_jsonb(a)-'identity_secret_id' order by a.created_at desc)
    from private.membership_applications a where a.user_id=auth.uid()),'[]'::jsonb);
end;$$;

create function public.membership_submit(p_kind text,p_type public.membership_type,p_name text,p_identity text,
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
  if p_referrer is not null and (p_referrer=v_actor or not exists(select 1 from public.memberships m join public.profiles p on p.id=m.user_id where m.user_id=p_referrer and m.status='active' and p.is_active)) then raise exception 'invalid_referrer'; end if;
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

create function public.admin_membership_applications()
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.is_admin(null) then raise exception 'admin_required'; end if;
  return coalesce((select jsonb_agg(to_jsonb(a)-'identity_secret_id' || jsonb_build_object('referrer_name',p.display_name,'team_name',t.name) order by a.created_at desc)
    from private.membership_applications a left join public.profiles p on p.id=a.referrer_id left join public.teams t on t.id=a.proposed_team_id),'[]'::jsonb);
end;$$;

create function public.admin_membership_review(p_application uuid,p_decision text,p_note text,p_member_since date,p_year integer,p_eligibility_confirmed boolean)
returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_a private.membership_applications%rowtype; v_m public.memberships%rowtype; v_year integer:=extract(year from now() at time zone 'Asia/Taipei');
begin
  if v_actor is null or not private.is_admin(null) then raise exception 'admin_required'; end if;
  if p_decision is null or p_decision not in ('approved','needs_info','rejected') then raise exception 'invalid_decision'; end if;
  select * into v_a from private.membership_applications where id=p_application for update;
  if not found or v_a.status<>'pending' then raise exception 'application_not_pending'; end if;
  if v_a.user_id=v_actor then raise exception 'cannot_review_own_application'; end if;
  if coalesce(length(trim(p_note)),0) not between 1 and 1000 then raise exception 'review_note_required'; end if;
  if p_decision='approved' then
    if p_eligibility_confirmed is distinct from true then raise exception 'eligibility_confirmation_required'; end if;
    if p_year is distinct from v_year or p_member_since is null or p_member_since>(now() at time zone 'Asia/Taipei')::date then raise exception 'invalid_membership_period'; end if;
    perform 1 from public.profiles where id=v_a.user_id for no key update;
    select * into v_m from public.memberships where user_id=v_a.user_id for update;
    if v_m.membership_type='lifetime' and v_a.membership_type<>'lifetime' then raise exception 'cannot_downgrade_lifetime'; end if;
    if v_m.member_since is not null and p_member_since<>v_m.member_since then raise exception 'original_member_since_required'; end if;
    if exists(select 1 from private.membership_register where user_id=v_a.user_id and membership_year=p_year) then raise exception 'membership_year_already_confirmed'; end if;
    if v_a.join_team_consent then
      -- Never silently replace another team; a unique partial index also guards concurrent joins.
      if not exists(select 1 from public.team_members tm join public.teams t on t.id=tm.team_id and t.is_active where tm.user_id=v_a.referrer_id and tm.team_id=v_a.proposed_team_id and tm.left_at is null) then raise exception 'referrer_team_changed'; end if;
      if exists(select 1 from public.team_members where user_id=v_a.user_id and left_at is null and team_id<>v_a.proposed_team_id) then raise exception 'applicant_already_in_other_team'; end if;
      insert into public.team_members(team_id,user_id,role) values(v_a.proposed_team_id,v_a.user_id,'member')
      on conflict(team_id,user_id) do update set left_at=null,joined_at=case when public.team_members.left_at is not null then now() else public.team_members.joined_at end;
    end if;
    insert into public.memberships(user_id,membership_type,member_since,status) values(v_a.user_id,v_a.membership_type,p_member_since,'active')
    on conflict(user_id) do update set membership_type=excluded.membership_type,member_since=excluded.member_since,status='active',updated_at=now();
    insert into private.membership_register(user_id,membership_year,membership_type,full_name,member_since,referrer_id,application_id,confirmed_by)
    values(v_a.user_id,p_year,v_a.membership_type,v_a.full_name,p_member_since,v_a.referrer_id,v_a.id,v_actor);
  end if;
  update private.membership_applications set status=p_decision,review_note=trim(p_note),reviewed_by=v_actor,reviewed_at=now() where id=v_a.id;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'admin','membership_'||p_decision,'membership_application',v_a.id::text,'已處理會員申請；詳細審核備註限申請人及會員管理員查閱');
end;$$;

create function public.membership_directory(p_year integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_year integer:=extract(year from now() at time zone 'Asia/Taipei');
begin
  if auth.uid() is null or not (private.is_admin(null) or exists(select 1 from public.memberships where user_id=auth.uid() and status='active')) then raise exception 'active_membership_required'; end if;
  if p_year is null or p_year<1900 or p_year>v_year then raise exception 'invalid_year'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'name',r.full_name,'membership_type',r.membership_type,'member_since',r.member_since,'referrer_name',p.display_name,'confirmed_at',r.confirmed_at) order by r.full_name)
    from (select distinct on (user_id) * from private.membership_register
      where membership_year=p_year or (membership_type='lifetime' and membership_year<=p_year)
      order by user_id,membership_year desc) r
    join public.memberships m on m.user_id=r.user_id
    left join public.profiles p on p.id=r.referrer_id
    where p_year<v_year or m.status='active'),'[]'::jsonb);
end;$$;

-- Explicit grants: authenticated access always passes the function's ownership/admin checks.
revoke all on function public.membership_referrers(),public.membership_applications_self(),public.admin_membership_applications(),public.membership_directory(integer) from public,anon;
grant execute on function public.membership_referrers(),public.membership_applications_self(),public.admin_membership_applications(),public.membership_directory(integer) to authenticated;
revoke all on function public.membership_submit(text,public.membership_type,text,text,text,text,text,uuid,uuid,boolean,boolean),public.admin_membership_review(uuid,text,text,date,integer,boolean) from public,anon;
grant execute on function public.membership_submit(text,public.membership_type,text,text,text,text,text,uuid,uuid,boolean,boolean),public.admin_membership_review(uuid,text,text,date,integer,boolean) to authenticated;

-- Database invariant also covers concurrent legacy invitation acceptance.
create unique index team_members_one_active_team on public.team_members(user_id) where left_at is null;

create function public.admin_membership_confirm_existing(p_user uuid,p_name text,p_member_since date,p_year integer,p_referrer uuid,p_note text)
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
  insert into private.membership_register(user_id,membership_year,membership_type,full_name,member_since,referrer_id,confirmed_by)
  values(p_user,p_year,v_m.membership_type,trim(p_name),p_member_since,p_referrer,auth.uid());
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(auth.uid(),'admin','membership_register_confirmed','membership',v_m.id::text,'確認當年度名冊，原入會日期與歷史資料保留');
end;$$;
revoke all on function public.admin_membership_confirm_existing(uuid,text,date,integer,uuid,text) from public,anon;
grant execute on function public.admin_membership_confirm_existing(uuid,text,date,integer,uuid,text) to authenticated;
