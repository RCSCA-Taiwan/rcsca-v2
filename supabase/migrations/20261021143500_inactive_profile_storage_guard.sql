-- The PostgREST pre-request guard does not cover Supabase Storage. Mirror the
-- active-profile boundary in authenticated Storage policies so a deactivated user
-- cannot keep using an already-issued JWT to read private community media or mutate
-- member-owned media during the token's remaining lifetime.

drop policy if exists community_image_read on storage.objects;
create policy community_image_read on storage.objects
for select to authenticated
using (
  bucket_id='community-media'
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_active)
  and private.community_image_readable(name)
);

drop policy if exists community_unused_image_delete on storage.objects;
create policy community_unused_image_delete on storage.objects
for delete to authenticated
using (
  bucket_id='community-media'
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_active)
  and private.community_image_unused(name)
);

drop policy if exists partner_offer_image_upload on storage.objects;
create policy partner_offer_image_upload on storage.objects
for insert to authenticated
with check (
  bucket_id='partner-offer-media'
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\\.jpg$'
  and split_part(name,'/',1)=auth.uid()::text
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_active)
  and exists(
    select 1 from public.enterprise_users u
    where u.user_id=auth.uid() and private.partner_offer_member(u.enterprise_id,true)
  )
);

drop policy if exists partner_offer_unused_image_delete on storage.objects;
create policy partner_offer_unused_image_delete on storage.objects
for delete to authenticated
using (
  bucket_id='partner-offer-media'
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_active)
  and private.partner_offer_image_unused(name)
);
