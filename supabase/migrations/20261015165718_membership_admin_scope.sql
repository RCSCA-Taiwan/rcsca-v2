-- Membership administration requires admin/super_admin, not unrelated specialist review roles.
create or replace function public.admin_membership_applications()
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required'; end if;
  return coalesce((select jsonb_agg(to_jsonb(a)-'identity_secret_id' || jsonb_build_object('referrer_name',p.display_name,'team_name',t.name) order by a.created_at desc)
    from private.membership_applications a left join public.profiles p on p.id=a.referrer_id left join public.teams t on t.id=a.proposed_team_id),'[]'::jsonb);
end;$$;

create or replace function public.admin_membership_review(p_application uuid,p_decision text,p_note text,p_member_since date,p_year integer,p_eligibility_confirmed boolean)
returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_a private.membership_applications%rowtype; v_m public.memberships%rowtype; v_year integer:=extract(year from now() at time zone 'Asia/Taipei');
begin
  if v_actor is null or not private.is_admin('admin') then raise exception 'admin_required'; end if;
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

create or replace function public.admin_membership_confirm_existing(p_user uuid,p_name text,p_member_since date,p_year integer,p_referrer uuid,p_note text)
returns void language plpgsql security definer set search_path='' as $$
declare v_m public.memberships%rowtype; v_year integer:=extract(year from now() at time zone 'Asia/Taipei');
begin
  if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required'; end if;
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

create or replace function public.membership_directory(p_year integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_year integer:=extract(year from now() at time zone 'Asia/Taipei');
begin
  if auth.uid() is null or not (private.is_admin('admin') or public.is_active_member(auth.uid())) then raise exception 'active_membership_required'; end if;
  if p_year is null or p_year<1900 or p_year>v_year then raise exception 'invalid_year'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'name',r.full_name,'membership_type',r.membership_type,'member_since',r.member_since,'referrer_name',p.display_name,'confirmed_at',r.confirmed_at) order by r.full_name)
    from (select distinct on (user_id) * from private.membership_register
      where membership_year=p_year or (membership_type='lifetime' and membership_year<=p_year)
      order by user_id,membership_year desc) r
    join public.memberships m on m.user_id=r.user_id
    left join public.profiles p on p.id=r.referrer_id
    where p_year<v_year or m.status='active'),'[]'::jsonb);
end;$$;
