-- Canonical export recovered read-only from Staging migration history.
-- Version: 20260902201815; name: v1260_reduce_rpc_attack_surface

-- V1260: remove internal/deprecated SECURITY DEFINER functions from the
-- externally callable Data API surface.

revoke execute on function public.admin_finalize_esg_asset(
  uuid,text,text,text,text,text,numeric,text,text[],text
) from public, anon, authenticated;

revoke execute on function public.admin_mark_esg_report_ready(
  uuid,boolean,text
) from public, anon, authenticated;

revoke execute on function public.admin_update_network_match(
  uuid,text,text
) from public, anon, authenticated;

revoke execute on function public.queue_completed_outcome(
  text,uuid,uuid,boolean,boolean
) from public, anon, authenticated;

-- These remain callable by their owner from guarded SECURITY DEFINER RPCs,
-- but are no longer direct Data API endpoints.
revoke execute on function public.is_active_member(uuid)
  from public, anon, authenticated;
revoke execute on function public.is_enterprise_manager(uuid)
  from public, anon, authenticated;

-- New functions must opt in explicitly to Data API exposure.
alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;
