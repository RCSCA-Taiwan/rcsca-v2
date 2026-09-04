-- Canonical export recovered read-only from Staging migration history.
-- Version: 20260902202618; name: v1280_revoke_direct_table_mutations

-- V1280: the web application mutates domain data exclusively through reviewed
-- SECURITY DEFINER RPCs. Remove the unused direct PostgREST write surface.
-- SELECT remains governed by each table's RLS policies.

revoke insert, update, delete, truncate, references, trigger
  on all tables in schema public
  from anon, authenticated;

alter default privileges in schema public
  revoke insert, update, delete, truncate, references, trigger
  on tables
  from anon, authenticated;
