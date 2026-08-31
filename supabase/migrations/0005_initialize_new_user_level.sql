-- Every signed-in user begins as a shared partner at Lv.1. Membership remains separate.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, email, mobile)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(coalesce(new.email,''),'@',1), ''),
    new.email,
    new.phone
  )
  on conflict (id) do nothing;

  insert into public.member_levels (user_id, level, lifetime_xp)
  values (new.id, 1, 0)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
