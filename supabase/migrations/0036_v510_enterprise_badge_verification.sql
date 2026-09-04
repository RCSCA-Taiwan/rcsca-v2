-- V510: controlled annual enterprise badge issuance and public verification.

create or replace function public.admin_issue_enterprise_badge(
  p_enterprise_id uuid,
  p_year integer,
  p_badge_label text default '1% PARTNER',
  p_expires_at timestamptz default null
) returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid := auth.uid();
  v_badge uuid;
begin
  if v_actor is null or not private.is_admin('admin') then
    raise exception 'insufficient_privilege';
  end if;
  if p_year < 2018 or p_year > extract(year from now())::int + 1 then
    raise exception 'invalid_badge_year';
  end if;
  if not exists(select 1 from public.enterprises where id=p_enterprise_id and status='approved') then
    raise exception 'enterprise_not_approved';
  end if;

  insert into public.enterprise_badges(enterprise_id,year,badge_label,issued_at,expires_at,status)
  values(p_enterprise_id,p_year,coalesce(nullif(trim(p_badge_label),''),'1% PARTNER'),now(),p_expires_at,'issued')
  on conflict(enterprise_id,year) do update
    set badge_label=excluded.badge_label,
        issued_at=now(),
        expires_at=excluded.expires_at,
        status='issued'
  returning id into v_badge;

  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'admin','issue_enterprise_badge','enterprise_badge',v_badge::text,'年度 1% 標章已核發');

  insert into public.notifications(user_id,notification_type,title,body,related_type,related_id)
  select eu.user_id,'enterprise_badge','年度 1% 標章已核發',p_year::text||' 年度企業共享標章已核發。','enterprise_badge',v_badge
  from public.enterprise_users eu where eu.enterprise_id=p_enterprise_id;

  return v_badge;
end;$$;

create or replace function public.admin_revoke_enterprise_badge(
  p_badge_id uuid,
  p_note text default null
) returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor uuid := auth.uid();
  v_enterprise uuid;
begin
  if v_actor is null or not private.is_admin('admin') then
    raise exception 'insufficient_privilege';
  end if;
  update public.enterprise_badges set status='revoked',expires_at=coalesce(expires_at,now())
  where id=p_badge_id returning enterprise_id into v_enterprise;
  if v_enterprise is null then raise exception 'badge_not_found'; end if;

  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'admin','revoke_enterprise_badge','enterprise_badge',p_badge_id::text,coalesce(p_note,'年度標章已撤回'));

  insert into public.notifications(user_id,notification_type,title,body,related_type,related_id)
  select eu.user_id,'enterprise_badge','年度 1% 標章狀態更新','企業年度共享標章已由 RCSCA 更新，請至企業管理入口查看。','enterprise_badge',p_badge_id
  from public.enterprise_users eu where eu.enterprise_id=v_enterprise;
end;$$;

revoke all on function public.admin_issue_enterprise_badge(uuid,integer,text,timestamptz) from public,anon;
revoke all on function public.admin_revoke_enterprise_badge(uuid,text) from public,anon;
grant execute on function public.admin_issue_enterprise_badge(uuid,integer,text,timestamptz) to authenticated;
grant execute on function public.admin_revoke_enterprise_badge(uuid,text) to authenticated;

create index if not exists idx_enterprise_badges_status_year on public.enterprise_badges(status,year desc);
