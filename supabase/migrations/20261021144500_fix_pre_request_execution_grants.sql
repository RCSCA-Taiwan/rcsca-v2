-- PostgREST invokes db_pre_request after switching to the request's database role.
-- The hook therefore needs EXECUTE for the API roles it is expected to inspect.
-- This does not bypass the guard: inactive authenticated users still raise 403 inside
-- the function, while anon/service_role intentionally retain their existing behavior.

revoke all on function public.rcsca_api_pre_request() from public;
grant execute on function public.rcsca_api_pre_request() to anon,authenticated,service_role,authenticator;
notify pgrst,'reload schema';
