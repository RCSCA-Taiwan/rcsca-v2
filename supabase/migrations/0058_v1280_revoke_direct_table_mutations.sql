-- V1280: the web application mutates domain data exclusively through reviewed
-- SECURITY DEFINER RPCs. Remove the unused direct PostgREST write surface.
-- SELECT remains governed by each table's RLS policies.

revoke insert, update, delete, truncate, references, trigger
  on all tables in schema public
  from anon, authenticated;

-- New public tables must explicitly opt in to direct client-side mutations.
alter default privileges in schema public
  revoke insert, update, delete, truncate, references, trigger
  on tables
  from anon, authenticated;
