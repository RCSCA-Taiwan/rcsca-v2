-- RCSCA V2 Staging schema contract, refreshed after the V1300 notification fix.
-- Any false value means the remote schema drifted from the verified V1300 state.

with
columns_data as (
  select table_schema||'.'||table_name||'.'||ordinal_position||':'||column_name||':'||
    data_type||':'||coalesce(udt_schema,'')||'.'||coalesce(udt_name,'')||':'||
    is_nullable||':'||coalesce(column_default,'') d
  from information_schema.columns where table_schema in ('public','private')
),
constraints_data as (
  select n.nspname||'.'||c.relname||':'||con.conname||':'||pg_get_constraintdef(con.oid,true) d
  from pg_constraint con join pg_class c on c.oid=con.conrelid
  join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','private')
),
indexes_data as (
  select schemaname||'.'||tablename||':'||indexname||':'||indexdef d
  from pg_indexes where schemaname in ('public','private')
),
views_data as (
  select n.nspname||'.'||c.relname||':'||coalesce(array_to_string(c.reloptions,','),'')||':'||
    pg_get_viewdef(c.oid,true) d
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname in ('public','private') and c.relkind='v'
),
policies_data as (
  select schemaname||'.'||tablename||':'||policyname||':'||permissive||':'||
    array_to_string(roles,',')||':'||cmd||':'||coalesce(qual,'')||':'||coalesce(with_check,'') d
  from pg_policies where schemaname in ('public','private')
),
functions_data as (
  select n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||'):'||
    pg_get_functiondef(p.oid)||':'||coalesce(array_to_string(p.proconfig,','),'')||':'||
    coalesce(array_to_string(p.proacl,','),'') d
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname in ('public','private')
),
triggers_data as (
  select n.nspname||'.'||c.relname||':'||t.tgname||':'||pg_get_triggerdef(t.oid,true) d
  from pg_trigger t join pg_class c on c.oid=t.tgrelid
  join pg_namespace n on n.oid=c.relnamespace
  where not t.tgisinternal and n.nspname in ('public','private')
),
tables_data as (
  select n.nspname||'.'||c.relname||':'||c.relrowsecurity||':'||c.relforcerowsecurity d
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname in ('public','private') and c.relkind='r'
),
relation_grants as (
  select grantee||':'||table_schema||'.'||table_name||':'||privilege_type d
  from information_schema.role_table_grants
  where table_schema in ('public','private')
    and grantee in ('anon','authenticated','service_role')
),
routine_grants as (
  select grantee||':'||routine_schema||'.'||routine_name||':'||specific_name||':'||privilege_type d
  from information_schema.role_routine_grants
  where routine_schema in ('public','private')
    and grantee in ('anon','authenticated','service_role')
)
select
  (select count(*)=37 and md5(string_agg(d,E'\n' order by d))='728833be8d60f094afd61a4b3fe64beb' from tables_data) tables_match,
  (select count(*)=457 and md5(string_agg(d,E'\n' order by d))='e703ebc2fe09566aaa43f44c973b46ae' from columns_data) columns_match,
  (select count(*)=127 and md5(string_agg(d,E'\n' order by d))='b29ed30988d93204ae939ca5c3598ae8' from constraints_data) constraints_match,
  (select count(*)=135 and md5(string_agg(d,E'\n' order by d))='6aa888751d4b7a7a46bafea650e3abcf' from indexes_data) indexes_match,
  (select count(*)=13 and md5(string_agg(d,E'\n' order by d))='3707a5d14af8de509fed729d662d89b9' from views_data) views_match,
  (select count(*)=61 and md5(string_agg(d,E'\n' order by d))='db909e6583efaa4edeef06a41a086b3a' from policies_data) policies_match,
  (select count(*)=72 and md5(string_agg(d,E'\n' order by d))='4e384caf74c7bb65d8078449884d699c' from functions_data) functions_match,
  (select count(*)=6 and md5(string_agg(d,E'\n' order by d))='c57eddc54c26ae57263b09a4341c454c' from triggers_data) triggers_match,
  (select count(*)=438 and md5(string_agg(d,E'\n' order by d))='5a6177df49ffb283ff93c50048078f23' from relation_grants) relation_grants_match,
  (select count(*)=118 and md5(string_agg(d,E'\n' order by d))='461323210a9366dbd15377f596902bc9' from routine_grants) routine_grants_match;
