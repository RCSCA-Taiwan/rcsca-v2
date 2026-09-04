-- Canonical export recovered read-only from Staging migration history.
-- Version: 20260831055803; name: self_service_authenticated_writes

-- Allow authenticated users to create and manage only their own low-risk records.
-- Financial amounts, XP, points, membership, enterprise approval and admin data remain server/admin controlled.

grant update (display_name, mobile, locale, updated_at) on public.profiles to authenticated;
grant select, insert on public.activity_participations to authenticated;
grant select, insert, update on public.network_requests to authenticated;

-- Profile ownership is already enforced for reads/updates. Limit writable columns via column grants above.

create policy "participation self insert"
on public.activity_participations
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'pending'::public.verification_status
  and verified_by is null
  and verified_at is null
);

create policy "network requests self insert"
on public.network_requests
for insert
to authenticated
with check (
  requester_user_id = (select auth.uid())
  and status = 'submitted'::public.review_status
);

create policy "network requests self update before review"
on public.network_requests
for update
to authenticated
using (
  requester_user_id = (select auth.uid())
  and status in ('draft','submitted','needs_info')
)
with check (
  requester_user_id = (select auth.uid())
  and status in ('draft','submitted','needs_info','cancelled')
);

-- User-facing indexes for self-service query paths.
create index if not exists idx_activity_participations_user_status
  on public.activity_participations(user_id,status,created_at desc);
create index if not exists idx_network_requests_user_status
  on public.network_requests(requester_user_id,status,updated_at desc);
