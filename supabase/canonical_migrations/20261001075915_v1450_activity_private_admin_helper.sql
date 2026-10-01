-- Canonical export recovered from Production migration history.
-- Version: 20261001075915; name: v1450_activity_private_admin_helper

-- V1450: keep activity administration on the private role helper.
do $migration$
declare
  v_signature regprocedure := 'public.admin_upsert_activity(uuid,text,text,text,text,timestamp with time zone,timestamp with time zone,text)'::regprocedure;
  v_definition text;
begin
  if to_regprocedure('private.is_admin(text)') is null then
    raise exception 'private_admin_helper_missing';
  end if;
  select pg_get_functiondef(v_signature) into v_definition;
  if position('public.is_admin()' in v_definition) > 0 then
    execute replace(v_definition, 'public.is_admin()', 'private.is_admin()');
  elsif position('private.is_admin()' in v_definition) = 0 then
    raise exception 'unexpected_activity_authorization_definition';
  end if;
end;
$migration$;
