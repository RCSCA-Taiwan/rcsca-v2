begin;

do $fix$
declare
  v_function regprocedure :=
    'public.queue_completed_outcome(text,uuid,uuid,boolean,boolean)'
      ::regprocedure;
  v_definition text;
  v_matches integer;
  v_pattern text :=
    'values\s*\(\s*v_actor\s*,\s*''outcome_reviewer''\s*,';
  v_replacement text := $replacement$
    values(
      v_actor,
      (
        select ar.role_key::text
        from public.admin_roles ar
        where ar.user_id = v_actor
          and ar.role_key in (
            'super_admin', 'admin', 'network_manager',
            'activity_reviewer', 'enterprise_reviewer'
          )
        order by case ar.role_key
          when 'super_admin' then 1
          when 'admin' then 2
          when 'network_manager' then 3
          when 'activity_reviewer' then 4
          when 'enterprise_reviewer' then 5
        end
        limit 1
      ),
  $replacement$;
begin
  v_definition := pg_get_functiondef(v_function);

  if position('insufficient_privilege' in v_definition) = 0
    or not (
      v_definition ~*
      'on\s+conflict\s*\(\s*source_type\s*,\s*source_id\s*\)'
    ) then
    raise exception '缺少權限或防重複規則，已停止。';
  end if;

  select count(*) into v_matches
  from regexp_matches(v_definition, v_pattern, 'gi');

  if v_matches = 1 then
    execute regexp_replace(
      v_definition, v_pattern, v_replacement, 'i'
    );
  elsif v_matches = 0
    and position(v_replacement in v_definition) > 0 then
    null;
  else
    raise exception '函式內容不符合預期，已停止。';
  end if;
end;
$fix$;

commit;
