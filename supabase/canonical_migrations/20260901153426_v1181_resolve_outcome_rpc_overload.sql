-- Canonical export recovered read-only from Staging migration history.
-- Version: 20260901153426; name: v1181_resolve_outcome_rpc_overload

-- V1181: remove the redundant one-argument overload added by V1180.
-- Staging already contains the canonical five-argument function whose final
-- four parameters have defaults. Keeping both makes one-argument PostgREST
-- calls ambiguous.

drop function if exists public.admin_generate_outcome_drafts(uuid);

revoke all on function public.admin_generate_outcome_drafts(uuid,text,text,text,text)
from public,anon;
grant execute on function public.admin_generate_outcome_drafts(uuid,text,text,text,text)
to authenticated;
