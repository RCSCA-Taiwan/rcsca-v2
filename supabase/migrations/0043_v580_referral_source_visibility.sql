-- V580: make invitation/referral source visible to the member and auditable by admins.
create or replace function public.account_referral_source()
returns table(invitation_id uuid, source_type text, accepted_at timestamptz, inviter_display_name text, team_name text)
language sql security definer set search_path=public,private as $$
  select i.id,i.source_type,i.accepted_at,coalesce(p.display_name,'RCSCA 共享夥伴'),t.name
  from public.invitations i
  left join public.profiles p on p.id=i.inviter_user_id
  left join public.teams t on t.id=i.team_id
  where i.invitee_user_id=auth.uid() and i.status='accepted'
  order by i.accepted_at desc nulls last,i.created_at desc limit 1;
$$;
revoke all on function public.account_referral_source() from public;
grant execute on function public.account_referral_source() to authenticated;

create or replace function public.admin_referral_overview()
returns table(invitation_id uuid,status text,created_at timestamptz,accepted_at timestamptz,expires_at timestamptz,source_type text,team_name text,inviter_name text,invitee_name text)
language plpgsql security definer set search_path=public,private as $$
begin
  if not private.is_admin('admin') then raise exception 'admin_required'; end if;
  return query
  select i.id,i.status,i.created_at,i.accepted_at,i.expires_at,i.source_type,t.name,
         coalesce(a.display_name,a.email,'未識別邀請人'),coalesce(b.display_name,b.email,'尚未接受')
  from public.invitations i
  left join public.teams t on t.id=i.team_id
  left join public.profiles a on a.id=i.inviter_user_id
  left join public.profiles b on b.id=i.invitee_user_id
  order by i.created_at desc limit 500;
end;$$;
revoke all on function public.admin_referral_overview() from public;
grant execute on function public.admin_referral_overview() to authenticated;
