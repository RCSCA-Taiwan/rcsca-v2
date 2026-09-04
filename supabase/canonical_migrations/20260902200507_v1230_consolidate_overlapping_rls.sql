-- Canonical export recovered read-only from Staging migration history.
-- Version: 20260902200507; name: v1230_consolidate_overlapping_rls

-- V1230: consolidate overlapping permissive policies without widening access.
-- The Supabase CLI is unavailable in this workspace, so this repository's
-- existing sequential filename convention is retained.

drop policy if exists "enterprise case events admin read"
  on public.enterprise_service_request_events;
drop policy if exists "enterprise case events own read"
  on public.enterprise_service_request_events;
create policy "enterprise case events participant read"
  on public.enterprise_service_request_events
  for select
  to authenticated
  using (
    (select private.is_admin(null))
    or (
      visible_to_enterprise = true
      and exists (
        select 1
        from public.enterprise_service_requests r
        where r.id = enterprise_service_request_events.request_id
          and (
            r.requester_user_id = (select auth.uid())
            or (
              r.enterprise_id is not null
              and private.is_enterprise_user(r.enterprise_id)
            )
          )
      )
    )
  );

-- Exact duplicate of "enterprise shares assigned insert".
drop policy if exists "enterprise users create own shares"
  on public.enterprise_shares;

drop policy if exists "enterprise shares approved public read"
  on public.enterprise_shares;
drop policy if exists "enterprise shares assigned read"
  on public.enterprise_shares;
create policy "enterprise shares public or assigned read"
  on public.enterprise_shares
  for select
  to public
  using (
    (status = 'approved'::public.review_status and public_result = true)
    or (
      (select auth.uid()) is not null
      and (
        private.is_enterprise_user(enterprise_id)
        or (select private.is_admin(null))
      )
    )
  );

drop policy if exists "enterprise shares assigned update draft"
  on public.enterprise_shares;
drop policy if exists "enterprise users update needs info shares"
  on public.enterprise_shares;
create policy "enterprise shares assigned update"
  on public.enterprise_shares
  for update
  to authenticated
  using (
    private.is_enterprise_user(enterprise_id)
    and status in (
      'draft'::public.review_status,
      'submitted'::public.review_status,
      'needs_info'::public.review_status
    )
  )
  with check (
    private.is_enterprise_user(enterprise_id)
    and status in (
      'draft'::public.review_status,
      'submitted'::public.review_status,
      'needs_info'::public.review_status
    )
    and public_result = false
  );
