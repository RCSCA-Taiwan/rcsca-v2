-- V1210: remove anonymous access from identity-bound SECURITY DEFINER helpers.

revoke all on function public.account_referral_source() from public,anon;
revoke all on function public.admin_referral_overview() from public,anon;
revoke all on function public.is_enterprise_manager(uuid) from public,anon;

grant execute on function public.account_referral_source() to authenticated;
grant execute on function public.admin_referral_overview() to authenticated;
grant execute on function public.is_enterprise_manager(uuid) to authenticated;
