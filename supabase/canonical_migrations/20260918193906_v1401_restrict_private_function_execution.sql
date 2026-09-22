-- Canonical export recovered read-only from Production migration history.
-- Version: 20260918193906; name: v1401_restrict_private_function_execution

-- Restrict private SECURITY DEFINER helpers to the least privilege required.
revoke execute on function private.can_edit_enterprise(uuid) from public, anon;
revoke execute on function private.enterprise_role(uuid) from public, anon;
revoke execute on function private.is_admin(text) from public, anon;
revoke execute on function private.is_enterprise_user(uuid) from public, anon;
revoke execute on function private.is_same_enterprise_user(uuid) from public, anon;

grant execute on function private.can_edit_enterprise(uuid) to authenticated;
grant execute on function private.enterprise_role(uuid) to authenticated;
grant execute on function private.is_admin(text) to authenticated;
grant execute on function private.is_enterprise_user(uuid) to authenticated;
grant execute on function private.is_same_enterprise_user(uuid) to authenticated;

revoke execute on function private.guard_enterprise_change_request() from public, anon, authenticated;
revoke execute on function private.guard_enterprise_service_request_write() from public, anon, authenticated;
revoke execute on function private.guard_enterprise_share_write() from public, anon, authenticated;
