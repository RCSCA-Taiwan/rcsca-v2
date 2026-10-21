-- Inactive profiles must not keep using the Data API while an already-issued JWT
-- is still within its expiry window. Keep one narrow status RPC reachable so the
-- web client can detect deactivation, globally sign out, and return to login.

create or replace function public.account_status_self()
returns jsonb
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_actor uuid:=auth.uid();
  v_active boolean;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  select p.is_active into v_active from public.profiles p where p.id=v_actor;
  if not found then return jsonb_build_object('active',false,'profile_exists',false); end if;
  return jsonb_build_object('active',coalesce(v_active,false),'profile_exists',true);
end;$$;

revoke all on function public.account_status_self() from public,anon;
grant execute on function public.account_status_self() to authenticated;

create or replace function public.rcsca_api_pre_request()
returns void
language plpgsql
stable
security definer
set search_path=''
as $$
declare
  v_claims jsonb:=coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb);
  v_role text:=v_claims->>'role';
  v_sub text:=v_claims->>'sub';
  v_path text:=coalesce(current_setting('request.path',true),'');
  v_active boolean;
begin
  -- Anonymous and trusted server-side service-role traffic retain their existing behavior.
  if v_role is null or v_role in ('anon','service_role') or v_sub is null or v_sub='' then return; end if;
  if v_role<>'authenticated' then return; end if;

  -- This one RPC is intentionally reachable after deactivation so the browser can
  -- detect the inactive state and clear its Auth session instead of looping on 403s.
  if v_path='rpc/account_status_self' then return; end if;

  select p.is_active into v_active from public.profiles p where p.id=v_sub::uuid;
  if found and coalesce(v_active,false) then return; end if;

  raise sqlstate 'PGRST' using
    message=jsonb_build_object('code','account_inactive','message','Account inactive')::text,
    detail=jsonb_build_object('status',403)::text;
exception
  when invalid_text_representation then
    raise sqlstate 'PGRST' using
      message=jsonb_build_object('code','invalid_subject','message','Invalid authenticated subject')::text,
      detail=jsonb_build_object('status',401)::text;
end;$$;

revoke all on function public.rcsca_api_pre_request() from public,anon,authenticated;
grant execute on function public.rcsca_api_pre_request() to authenticator;

alter role authenticator set pgrst.db_pre_request='public.rcsca_api_pre_request';
notify pgrst,'reload config';

-- When a profile transitions to inactive, make sure the public-profile copy of the
-- login email is removed as part of the same database transaction. Auth identity and
-- formal historical records are intentionally retained for referential integrity.
create or replace function private.scrub_inactive_profile_pii()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if new.is_active is false then
    new.display_name:=null;
    new.mobile:=null;
    new.email:=null;
  end if;
  return new;
end;$$;

revoke all on function private.scrub_inactive_profile_pii() from public,anon,authenticated;

drop trigger if exists scrub_inactive_profile_pii on public.profiles;
create trigger scrub_inactive_profile_pii
before insert or update of is_active on public.profiles
for each row execute function private.scrub_inactive_profile_pii();
