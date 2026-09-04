-- Canonical export recovered read-only from Staging migration history.
-- Version: 20260831175753; name: v560_enterprise_role_enforcement

create or replace function private.enterprise_role(target uuid)
returns text language sql stable security definer set search_path=public as $$
  select eu.role from public.enterprise_users eu
  where eu.enterprise_id=target and eu.user_id=auth.uid() limit 1;
$$;
create or replace function private.can_edit_enterprise(target uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select private.is_admin(null) or coalesce(private.enterprise_role(target) in ('manager','editor'),false);
$$;
create or replace function private.guard_enterprise_share_write()
returns trigger language plpgsql security definer set search_path=public,private as $$
begin
  if auth.uid() is not null and not private.can_edit_enterprise(coalesce(new.enterprise_id,old.enterprise_id)) then raise exception 'enterprise_editor_required'; end if;
  return new;
end;$$;
drop trigger if exists trg_guard_enterprise_share_write on public.enterprise_shares;
create trigger trg_guard_enterprise_share_write before insert or update on public.enterprise_shares for each row execute function private.guard_enterprise_share_write();
create or replace function private.guard_enterprise_service_request_write()
returns trigger language plpgsql security definer set search_path=public,private as $$
begin
  if auth.uid() is not null and new.enterprise_id is not null and not private.can_edit_enterprise(new.enterprise_id) then raise exception 'enterprise_editor_required'; end if;
  return new;
end;$$;
drop trigger if exists trg_guard_enterprise_service_request_write on public.enterprise_service_requests;
create trigger trg_guard_enterprise_service_request_write before insert or update on public.enterprise_service_requests for each row execute function private.guard_enterprise_service_request_write();
create or replace function private.guard_enterprise_change_request()
returns trigger language plpgsql security definer set search_path=public,private as $$
declare v_enterprise uuid;
begin
  if auth.uid() is null or private.is_admin(null) then return new; end if;
  if new.subject_type='enterprise_profile' then v_enterprise:=new.subject_id;
  elsif new.subject_type='enterprise_share' then select enterprise_id into v_enterprise from public.enterprise_shares where id=new.subject_id;
  else return new; end if;
  if v_enterprise is null or not private.can_edit_enterprise(v_enterprise) then raise exception 'enterprise_editor_required'; end if;
  return new;
end;$$;
drop trigger if exists trg_guard_enterprise_change_request on public.record_change_requests;
create trigger trg_guard_enterprise_change_request before insert on public.record_change_requests for each row execute function private.guard_enterprise_change_request();
