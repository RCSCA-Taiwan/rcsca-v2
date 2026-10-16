-- Public reads must not require execute permission on administrative role helpers.
alter policy "network profiles public approved read" on public.network_profiles
to anon,authenticated using(public_visible=true and status='approved');
create policy "network profiles owner admin private read" on public.network_profiles
for select to authenticated using(user_id=(select auth.uid()) or (select private.is_admin(null)));
