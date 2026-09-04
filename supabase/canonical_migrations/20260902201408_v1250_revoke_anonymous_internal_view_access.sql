-- Canonical export recovered read-only from Staging migration history.
-- Version: 20260902201408; name: v1250_revoke_anonymous_internal_view_access

-- V1250: only the aggregate public impact view is intended for anonymous use.
-- All views remain security_invoker; authenticated access is preserved for
-- application dashboards and remains constrained by underlying table RLS.

revoke select on public.admin_esg_evidence_workbench from anon;
revoke select on public.enterprise_annual_report from anon;
revoke select on public.enterprise_case_workbench from anon;
revoke select on public.enterprise_esg_annual_delivery_report from anon;
revoke select on public.enterprise_esg_annual_summary from anon;
revoke select on public.enterprise_esg_delivery_readiness from anon;
revoke select on public.enterprise_esg_evidence_chain from anon;
revoke select on public.enterprise_esg_export_quality from anon;
revoke select on public.enterprise_esg_management_summary from anon;
revoke select on public.enterprise_impact_summary from anon;
revoke select on public.enterprise_management_summary from anon;
revoke select on public.user_sharing_summary from anon;

grant select on public.public_impact_summary to anon, authenticated;
