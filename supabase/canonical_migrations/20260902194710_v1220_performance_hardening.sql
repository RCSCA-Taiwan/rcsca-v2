-- Canonical export recovered read-only from Staging migration history.
-- Version: 20260902194710; name: v1220_performance_hardening

-- V1220: low-risk database performance hardening for RCSCA V2 Staging.
-- Adds indexes to the referencing side of foreign keys, avoids per-row auth
-- function evaluation in two RLS policies, and removes exact duplicate indexes.

create index if not exists idx_cycle_stories_created_by
  on public.cycle_stories (created_by);
create index if not exists idx_enterprise_applications_enterprise_id
  on public.enterprise_applications (enterprise_id);
create index if not exists idx_enterprise_esg_assets_created_by
  on public.enterprise_esg_assets (created_by);
create index if not exists idx_enterprise_service_request_events_created_by
  on public.enterprise_service_request_events (created_by);
create index if not exists idx_enterprise_service_requests_enterprise_id
  on public.enterprise_service_requests (enterprise_id);
create index if not exists idx_network_contact_consents_user_id
  on public.network_contact_consents (user_id);
create index if not exists idx_network_contact_reveals_counterparty_user_id
  on public.network_contact_reveals (counterparty_user_id);
create index if not exists idx_network_match_responses_responder_enterprise_id
  on public.network_match_responses (responder_enterprise_id);
create index if not exists idx_network_match_responses_reviewed_by
  on public.network_match_responses (reviewed_by);
create index if not exists idx_network_profiles_enterprise_id
  on public.network_profiles (enterprise_id);
create index if not exists idx_outcome_review_queue_enterprise_id
  on public.outcome_review_queue (enterprise_id);
create index if not exists idx_record_change_requests_reviewer_user_id
  on public.record_change_requests (reviewer_user_id);
create index if not exists idx_reward_catalog_enterprise_id
  on public.reward_catalog (enterprise_id);
create index if not exists idx_reward_redemptions_reward_id
  on public.reward_redemptions (reward_id);
create index if not exists idx_support_case_events_created_by
  on public.support_case_events (created_by);

drop policy if exists "support case events participant read"
  on public.support_case_events;
create policy "support case events participant read"
  on public.support_case_events
  for select
  to authenticated
  using (
    (select private.is_admin('case_manager'))
    or exists (
      select 1
      from public.support_cases c
      where c.id = support_case_events.case_id
        and (
          c.assigned_to = (select auth.uid())
          or (
            c.owner_user_id = (select auth.uid())
            and support_case_events.visible_to_owner
          )
        )
    )
  );

drop policy if exists "enterprise users same enterprise"
  on public.enterprise_users;
create policy "enterprise users same enterprise"
  on public.enterprise_users
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.is_admin(null))
    or private.is_same_enterprise_user(enterprise_id)
  );

-- These pairs have identical key definitions and are not constraint-backed.
drop index if exists public.idx_cycle_stories_publication;
drop index if exists public.idx_esg_assets_enterprise_status;
