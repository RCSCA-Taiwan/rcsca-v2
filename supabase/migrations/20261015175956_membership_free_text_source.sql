-- Preserve the applicant's original text, separately from verified person/company links.
alter table private.membership_applications add column referrer_text text check(length(referrer_text)<=200), add column referrer_enterprise_id uuid references public.enterprises(id), add column source_resolution text;
alter table private.membership_register add column referrer_text text, add column referrer_enterprise_id uuid references public.enterprises(id);

create function private.resolve_membership_source(p_text text,p_actor uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_text text:=lower(regexp_replace(normalize(trim(coalesce(p_text,'')),NFKC),'[[:space:]　]','','g')); v_matches jsonb; v_match jsonb; v_teams jsonb; v_count integer; v_id uuid; v_kind text;
begin
  if length(trim(coalesce(p_text,'')))>200 then raise exception 'invalid_source_text'; end if;
  if v_text='' then return jsonb_build_object('status','none'); end if;
  select jsonb_agg(jsonb_build_object('kind',s.kind,'id',s.id)) into v_matches from (
    select 'member' as kind,p.id from public.profiles p join public.memberships m on m.user_id=p.id
    where p.id<>p_actor and p.is_active and m.status='active' and m.membership_type in ('annual','lifetime')
      and lower(regexp_replace(normalize(coalesce(p.display_name,''),NFKC),'[[:space:]　]','','g'))=v_text
    union all
    select 'enterprise',e.id from public.enterprises e where e.status='approved' and (
      lower(regexp_replace(normalize(coalesce(e.display_name,''),NFKC),'[[:space:]　]','','g'))=v_text or
      lower(regexp_replace(normalize(e.legal_name,NFKC),'[[:space:]　]','','g'))=v_text)
  ) s;
  v_count:=jsonb_array_length(coalesce(v_matches,'[]'::jsonb));
  if v_count=0 then return jsonb_build_object('status','unmatched'); end if;
  if v_count>1 then return jsonb_build_object('status','ambiguous'); end if;
  v_match:=v_matches->0;v_kind:=v_match->>'kind';v_id:=(v_match->>'id')::uuid;
  select coalesce(jsonb_agg(jsonb_build_object('id',t.id,'name',t.name) order by t.name),'[]'::jsonb) into v_teams
  from public.teams t where t.is_active and (
    (v_kind='member' and (t.leader_user_id=v_id or exists(select 1 from public.team_members tm where tm.team_id=t.id and tm.user_id=v_id and tm.left_at is null))) or
    (v_kind='enterprise' and exists(select 1 from public.enterprise_users eu join public.profiles p on p.id=eu.user_id and p.is_active where eu.enterprise_id=v_id and
      (t.leader_user_id=eu.user_id or exists(select 1 from public.team_members tm where tm.team_id=t.id and tm.user_id=eu.user_id and tm.left_at is null))))
  );
  v_count:=jsonb_array_length(v_teams);
  return jsonb_build_object('status',case when v_count=1 then 'matched' when v_count=0 then 'no_team' else 'team_ambiguous' end,
    'source_kind',v_kind,'referrer_id',case when v_kind='member' then v_id end,'enterprise_id',case when v_kind='enterprise' then v_id end,
    'team_id',case when v_count=1 then v_teams->0->>'id' end,'team_name',case when v_count=1 then v_teams->0->>'name' end);
end;$$;
revoke all on function private.resolve_membership_source(text,uuid) from public,anon,authenticated;

create function public.membership_source_preview(p_text text)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'authentication_required'; end if;
  return private.resolve_membership_source(p_text,auth.uid());
end;$$;
revoke all on function public.membership_source_preview(text) from public,anon;
grant execute on function public.membership_source_preview(text) to authenticated;

create function public.membership_submit_with_source(p_kind text,p_type public.membership_type,p_name text,p_identity text,p_phone text,p_email text,p_address text,p_source_text text,p_join_team boolean,p_consent boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_source jsonb; v_id uuid; v_actor uuid:=auth.uid();
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  v_source:=private.resolve_membership_source(p_source_text,v_actor);
  if p_join_team is true and (v_source->>'status')<>'matched' then raise exception 'source_team_not_unique'; end if;
  v_id:=public.membership_submit(p_kind,p_type,p_name,p_identity,p_phone,p_email,p_address,(v_source->>'referrer_id')::uuid,null,false,p_consent);
  update private.membership_applications set referrer_text=nullif(trim(p_source_text),''),referrer_enterprise_id=(v_source->>'enterprise_id')::uuid,
    source_resolution=v_source->>'status',proposed_team_id=(v_source->>'team_id')::uuid,join_team_consent=coalesce(p_join_team,false) where id=v_id;
  return v_id;
end;$$;
revoke all on function public.membership_submit_with_source(text,public.membership_type,text,text,text,text,text,text,boolean,boolean) from public,anon;
grant execute on function public.membership_submit_with_source(text,public.membership_type,text,text,text,text,text,text,boolean,boolean) to authenticated;


create or replace function public.admin_membership_applications()
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required'; end if;
  return coalesce((select jsonb_agg(to_jsonb(a)-'identity_secret_id' || jsonb_build_object('referrer_name',coalesce(p.display_name,e.display_name,e.legal_name,a.referrer_text),'team_name',t.name) order by a.created_at desc)
    from private.membership_applications a left join public.profiles p on p.id=a.referrer_id left join public.enterprises e on e.id=a.referrer_enterprise_id left join public.teams t on t.id=a.proposed_team_id),'[]'::jsonb);
end;$$;

create or replace function public.admin_membership_review(p_application uuid,p_decision text,p_note text,p_member_since date,p_year integer,p_eligibility_confirmed boolean)
returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid(); v_a private.membership_applications%rowtype; v_m public.memberships%rowtype; v_source jsonb; v_year integer:=extract(year from now() at time zone 'Asia/Taipei');
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
      if v_a.referrer_text is not null then
        v_source:=private.resolve_membership_source(v_a.referrer_text,v_a.user_id);
        if v_source->>'status'<>'matched' or (v_source->>'team_id')::uuid is distinct from v_a.proposed_team_id
          or (v_source->>'referrer_id')::uuid is distinct from v_a.referrer_id
          or (v_source->>'enterprise_id')::uuid is distinct from v_a.referrer_enterprise_id then raise exception 'referrer_team_changed'; end if;
      elsif not exists(select 1 from public.team_members tm join public.teams t on t.id=tm.team_id and t.is_active where tm.user_id=v_a.referrer_id and tm.team_id=v_a.proposed_team_id and tm.left_at is null) then raise exception 'referrer_team_changed'; end if;
      if exists(select 1 from public.team_members where user_id=v_a.user_id and left_at is null and team_id<>v_a.proposed_team_id) then raise exception 'applicant_already_in_other_team'; end if;
      insert into public.team_members(team_id,user_id,role) values(v_a.proposed_team_id,v_a.user_id,'member')
      on conflict(team_id,user_id) do update set left_at=null,joined_at=case when public.team_members.left_at is not null then now() else public.team_members.joined_at end;
    end if;
    insert into public.memberships(user_id,membership_type,member_since,status) values(v_a.user_id,v_a.membership_type,p_member_since,'active')
    on conflict(user_id) do update set membership_type=excluded.membership_type,member_since=excluded.member_since,status='active',updated_at=now();
    insert into private.membership_register(user_id,membership_year,membership_type,full_name,member_since,referrer_id,application_id,confirmed_by)
    values(v_a.user_id,p_year,v_a.membership_type,v_a.full_name,p_member_since,v_a.referrer_id,v_a.id,v_actor);
    update private.membership_register set referrer_text=v_a.referrer_text,referrer_enterprise_id=v_a.referrer_enterprise_id where application_id=v_a.id;
  end if;
  update private.membership_applications set status=p_decision,review_note=trim(p_note),reviewed_by=v_actor,reviewed_at=now() where id=v_a.id;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'admin','membership_'||p_decision,'membership_application',v_a.id::text,'已處理會員申請；詳細審核備註限申請人及會員管理員查閱');
end;$$;

create or replace function public.membership_directory(p_year integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_year integer:=extract(year from now() at time zone 'Asia/Taipei');
begin
  if auth.uid() is null or not (private.is_admin('admin') or public.is_active_member(auth.uid())) then raise exception 'active_membership_required'; end if;
  if p_year is null or p_year<1900 or p_year>v_year then raise exception 'invalid_year'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'name',r.full_name,'membership_type',r.membership_type,'member_since',r.member_since,'referrer_name',coalesce(p.display_name,e.display_name,e.legal_name,r.referrer_text),'confirmed_at',r.confirmed_at) order by r.full_name)
    from (select distinct on (user_id) * from private.membership_register
      where membership_year=p_year or (membership_type='lifetime' and membership_year<=p_year)
      order by user_id,membership_year desc) r
    join public.memberships m on m.user_id=r.user_id
    left join public.profiles p on p.id=r.referrer_id left join public.enterprises e on e.id=r.referrer_enterprise_id
    where p_year<v_year or m.status='active'),'[]'::jsonb);
end;$$;
