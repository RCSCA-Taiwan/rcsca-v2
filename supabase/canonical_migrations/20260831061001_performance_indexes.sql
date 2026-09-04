-- Canonical export recovered read-only from Staging migration history.
-- Version: 20260831061001; name: performance_indexes

create index if not exists idx_activity_participations_verified_by on public.activity_participations(verified_by);
create index if not exists idx_audit_logs_actor_user on public.audit_logs(actor_user_id);
create index if not exists idx_case_needs_case on public.case_needs(case_id);
create index if not exists idx_enterprise_shares_enterprise on public.enterprise_shares(enterprise_id);
create index if not exists idx_enterprise_users_user on public.enterprise_users(user_id);
create index if not exists idx_identity_verifications_verified_by on public.identity_verifications(verified_by);
create index if not exists idx_invitations_invitee on public.invitations(invitee_user_id);
create index if not exists idx_invitations_inviter on public.invitations(inviter_user_id);
create index if not exists idx_network_requests_enterprise on public.network_requests(requester_enterprise_id);
create index if not exists idx_network_requests_user on public.network_requests(requester_user_id);
create index if not exists idx_point_transactions_created_by on public.point_transactions(created_by);
create index if not exists idx_support_cases_assigned_to on public.support_cases(assigned_to);
create index if not exists idx_support_cases_owner on public.support_cases(owner_user_id);
create index if not exists idx_team_members_user on public.team_members(user_id);
create index if not exists idx_teams_leader on public.teams(leader_user_id);
create index if not exists idx_xp_transactions_created_by on public.xp_transactions(created_by);
