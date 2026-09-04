-- Canonical export recovered read-only from Staging migration history.
-- Version: 20260830212748; name: harden_function_permissions

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.admin_verify_participation(uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.is_admin(text) from public, anon, authenticated;
revoke all on function public.is_enterprise_user(uuid) from public, anon, authenticated;

grant execute on function public.is_admin(text) to authenticated;
grant execute on function public.is_enterprise_user(uuid) to authenticated;
grant execute on function public.admin_verify_participation(uuid, boolean, text) to authenticated;
