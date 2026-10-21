-- Keep the inactive-profile Storage boundary from 20261021143500, but restore
-- the original valid UUID/UUID.jpg path expression. The previous migration
-- accidentally double-escaped the regex dot, which rejected every normal JPEG
-- object path before the active-profile / enterprise checks could pass.
drop policy if exists partner_offer_image_upload on storage.objects;
create policy partner_offer_image_upload on storage.objects
for insert to authenticated
with check (
  bucket_id='partner-offer-media'
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'
  and split_part(name,'/',1)=auth.uid()::text
  and exists(select 1 from public.profiles p where p.id=auth.uid() and p.is_active)
  and exists(
    select 1 from public.enterprise_users u
    where u.user_id=auth.uid() and private.partner_offer_member(u.enterprise_id,true)
  )
);
