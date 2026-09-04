-- Canonical export recovered read-only from Staging migration history.
-- Version: 20260831180934; name: team_invitation_lifecycle

-- V570: real team invitations, source preservation, and safe team lifecycle.
alter table public.invitations add column if not exists team_id uuid references public.teams(id) on delete set null;
alter table public.invitations add column if not exists token_hash text;
alter table public.invitations add column if not exists status text not null default 'recorded';
alter table public.invitations add column if not exists expires_at timestamptz;
alter table public.invitations add column if not exists accepted_at timestamptz;
create unique index if not exists idx_invitations_token_hash on public.invitations(token_hash) where token_hash is not null;
create index if not exists idx_invitations_team_status on public.invitations(team_id,status,created_at desc);
create index if not exists idx_team_members_team_active on public.team_members(team_id,joined_at desc) where left_at is null;

create or replace function public.team_create_invitation(p_team_id uuid)
returns text language plpgsql security definer set search_path=public,extensions as $$
declare v_actor uuid:=auth.uid(); v_raw text; v_hash text;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  if not exists(select 1 from public.team_members where team_id=p_team_id and user_id=v_actor and left_at is null) then raise exception 'team_member_required'; end if;
  if not exists(select 1 from public.teams where id=p_team_id and is_active) then raise exception 'team_inactive'; end if;
  v_raw:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
  v_hash:=encode(digest(v_raw,'sha256'),'hex');
  insert into public.invitations(inviter_user_id,team_id,source_type,source_note,token_hash,status,expires_at)
  values(v_actor,p_team_id,'team_invite','共享小隊邀請',v_hash,'pending',now()+interval '14 days');
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'user','create_team_invitation','team',p_team_id::text,'建立 14 天有效的小隊邀請；不影響 XP、點數或會籍');
  return v_raw;
end;$$;
revoke all on function public.team_create_invitation(uuid) from public,anon;
grant execute on function public.team_create_invitation(uuid) to authenticated;

create or replace function public.team_accept_invitation(p_token text)
returns uuid language plpgsql security definer set search_path=public,extensions as $$
declare v_actor uuid:=auth.uid(); v_hash text; v_inv public.invitations%rowtype;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  if coalesce(trim(p_token),'')='' then raise exception 'invalid_invitation'; end if;
  v_hash:=encode(digest(trim(p_token),'sha256'),'hex');
  select * into v_inv from public.invitations where token_hash=v_hash for update;
  if not found or v_inv.status<>'pending' then raise exception 'invitation_unavailable'; end if;
  if v_inv.expires_at is not null and v_inv.expires_at<now() then
    update public.invitations set status='expired' where id=v_inv.id;
    raise exception 'invitation_expired';
  end if;
  if v_inv.team_id is null or not exists(select 1 from public.teams where id=v_inv.team_id and is_active) then raise exception 'team_inactive'; end if;
  if exists(select 1 from public.team_members where user_id=v_actor and left_at is null and team_id<>v_inv.team_id) then raise exception 'already_in_another_team'; end if;
  insert into public.team_members(team_id,user_id,role,joined_at,left_at)
  values(v_inv.team_id,v_actor,'member',now(),null)
  on conflict(team_id,user_id) do update set left_at=null,joined_at=case when public.team_members.left_at is not null then now() else public.team_members.joined_at end;
  update public.invitations set invitee_user_id=v_actor,status='accepted',accepted_at=now() where id=v_inv.id;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'user','accept_team_invitation','team',v_inv.team_id::text,'接受共享小隊邀請；介紹來源永久保留，不形成上下線或利益關係');
  if v_inv.inviter_user_id is not null and v_inv.inviter_user_id<>v_actor then
    insert into public.user_notifications(recipient_user_id,kind,title,body,related_type,related_id)
    values(v_inv.inviter_user_id,'workflow','小隊邀請已被接受','你分享的小隊邀請已有人完成登入並加入。','team',v_inv.team_id);
  end if;
  return v_inv.team_id;
end;$$;
revoke all on function public.team_accept_invitation(text) from public,anon;
grant execute on function public.team_accept_invitation(text) to authenticated;

create or replace function public.team_leave_current()
returns void language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_tm public.team_members%rowtype;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  select * into v_tm from public.team_members where user_id=v_actor and left_at is null order by joined_at desc limit 1 for update;
  if not found then raise exception 'not_in_team'; end if;
  if v_tm.role='leader' or exists(select 1 from public.teams where id=v_tm.team_id and leader_user_id=v_actor) then raise exception 'leader_cannot_leave_before_transfer'; end if;
  update public.team_members set left_at=now() where id=v_tm.id;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'user','leave_team','team',v_tm.team_id::text,'自行離開共享小隊；歷史介紹來源與個人共享紀錄保留');
end;$$;
revoke all on function public.team_leave_current() from public,anon;
grant execute on function public.team_leave_current() to authenticated;

create or replace function public.admin_upsert_team(p_team_id uuid,p_name text,p_description text,p_leader_user_id uuid,p_is_active boolean default true)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_id uuid;
begin
  if v_actor is null or not private.is_admin(null) then raise exception 'insufficient_privilege'; end if;
  if coalesce(trim(p_name),'')='' then raise exception 'name_required'; end if;
  if p_team_id is null then
    insert into public.teams(name,description,leader_user_id,is_active) values(trim(p_name),nullif(trim(p_description),''),p_leader_user_id,coalesce(p_is_active,true)) returning id into v_id;
  else
    update public.teams set name=trim(p_name),description=nullif(trim(p_description),''),leader_user_id=p_leader_user_id,is_active=coalesce(p_is_active,true) where id=p_team_id returning id into v_id;
    if v_id is null then raise exception 'team_not_found'; end if;
  end if;
  if p_leader_user_id is not null then
    if exists(select 1 from public.team_members where user_id=p_leader_user_id and left_at is null and team_id<>v_id) then raise exception 'leader_already_in_other_team'; end if;
    insert into public.team_members(team_id,user_id,role,joined_at,left_at) values(v_id,p_leader_user_id,'leader',now(),null)
    on conflict(team_id,user_id) do update set role='leader',left_at=null;
    update public.team_members set role='member' where team_id=v_id and user_id<>p_leader_user_id and role='leader' and left_at is null;
  end if;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'admin','upsert_team','team',v_id::text,'建立或更新共享小隊與小隊長');
  return v_id;
end;$$;
revoke all on function public.admin_upsert_team(uuid,text,text,uuid,boolean) from public,anon;
grant execute on function public.admin_upsert_team(uuid,text,text,uuid,boolean) to authenticated;
