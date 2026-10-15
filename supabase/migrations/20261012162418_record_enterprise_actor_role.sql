begin;

do $fix$
declare
  r record;
  v_definition text;
  v_updated text;
  v_matches integer;
  v_count integer := 0;
  v_pattern text :=
    'values\s*\(\s*v_actor\s*,\s*''enterprise_reviewer''\s*,';
  v_replacement text := $replacement$
    values(
      v_actor,
      (
        select ar.role_key::text
        from public.admin_roles ar
        where ar.user_id = v_actor
          and ar.role_key in (
            'super_admin', 'admin', 'enterprise_reviewer'
          )
        order by case ar.role_key
          when 'super_admin' then 1
          when 'admin' then 2
          when 'enterprise_reviewer' then 3
        end
        limit 1
      ),
  $replacement$;
begin
  for r in
    select p.oid, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'admin_update_enterprise_service_request',
        'admin_mark_case_due_reminder'
      )
  loop
    v_definition := pg_get_functiondef(r.oid);

    if position(
      'enterprise_admin_required' in v_definition
    ) = 0 then
      raise exception '缺少權限檢查，已停止：%', r.proname;
    end if;

    select count(*) into v_matches
    from regexp_matches(v_definition, v_pattern, 'gi');

    if v_matches = 1 then
      v_updated := regexp_replace(
        v_definition, v_pattern, v_replacement, 'i'
      );
      execute v_updated;
    elsif v_matches = 0
      and position(v_replacement in v_definition) > 0 then
      -- 雲端已套用相同修正時，保留現有定義。
      null;
    else
      raise exception '函式內容不符合預期，已停止：%', r.proname;
    end if;

    v_count := v_count + 1;
  end loop;

  if v_count <> 2 then
    raise exception '函式數量不符，已停止：%', v_count;
  end if;
end;
$fix$;

commit;
