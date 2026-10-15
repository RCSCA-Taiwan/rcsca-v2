-- Limit anonymous network statistics to public completed requests.
-- Keep authenticated owner access unchanged.

revoke select on public.network_requests from anon;

grant select (status, privacy)
on public.network_requests to anon;

drop policy if exists "network requests anon statistics read"
on public.network_requests;

create policy "network requests anon statistics read"
on public.network_requests
for select to anon
using (
  status = 'completed'::public.review_status
  and privacy = 'public_summary'::public.privacy_scope
);
