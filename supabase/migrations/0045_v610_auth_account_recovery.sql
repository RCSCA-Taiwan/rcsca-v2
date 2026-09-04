-- V610: keep public profile email aligned with verified Supabase Auth email changes.
-- Passwords remain exclusively in Supabase Auth and are never copied to public tables.
create or replace function public.sync_profile_auth_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
       set email = new.email,
           updated_at = now()
     where id = new.id;
  end if;
  return new;
end;
$$;

revoke all on function public.sync_profile_auth_email() from public, anon, authenticated;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
after update of email on auth.users
for each row
execute function public.sync_profile_auth_email();
