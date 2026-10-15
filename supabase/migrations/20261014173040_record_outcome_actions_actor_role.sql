-- Record the actual authorized actor role for outcome actions.
-- Only super_admin and outcome_reviewer satisfy the existing authorization.
-- Preserve function bodies, signatures, ownership, configuration and grants.
begin;

do $fix$
declare
  r record;
  v_oid oid;
  v_definition text;
  v_updated text;
  v_pattern text;
  v_replacement text;
  v_matches integer;
  v_before record;
  v_after record;
begin
  for r in select * from (values
    ('public.admin_generate_outcome_drafts(uuid,text,text,text,text)', 'generate_outcome_drafts'),
    ('public.admin_publish_cycle_story(uuid,text,text,boolean,boolean,text)', 'publish_cycle_story')
  ) as targets(signature, action)
  loop
    v_oid := to_regprocedure(r.signature);
    if v_oid is null then
      raise exception 'Missing expected outcome function: %', r.signature;
    end if;
    v_definition := pg_get_functiondef(v_oid);
    if v_definition !~ $guard$if\s+v_actor\s+is\s+null\s+or\s+not\s+private\.is_admin\('outcome_reviewer'\)\s+then$guard$
      or position('outcome_reviewer_required' in v_definition) = 0 then
      raise exception 'Unexpected outcome authorization: %', r.signature;
    end if;

    v_pattern := format(
      $pattern$values\s*\(\s*v_actor\s*,\s*'outcome_reviewer'\s*,\s*'%s'\s*,$pattern$,
      r.action
    );
    v_replacement := format($replacement$values(
      v_actor,
      (
        select ar.role_key::text
        from public.admin_roles ar
        where ar.user_id = v_actor
          and ar.role_key in ('super_admin', 'outcome_reviewer')
        order by case ar.role_key
          when 'super_admin' then 1
          when 'outcome_reviewer' then 2
        end
        limit 1
      ),
      '%s',$replacement$, r.action);

    select count(*) into v_matches
    from regexp_matches(v_definition, v_pattern, 'g');
    if v_matches = 1 then
      select proowner, proacl, prosecdef, proconfig into v_before
      from pg_proc where oid = v_oid;
      v_updated := regexp_replace(v_definition, v_pattern, v_replacement);
      execute v_updated;
      select proowner, proacl, prosecdef, proconfig into v_after
      from pg_proc where oid = v_oid;
      if v_before is distinct from v_after then
        raise exception 'Outcome function metadata changed: %', r.signature;
      end if;
    elsif v_matches = 0 and position(v_replacement in v_definition) > 0 then
      -- The same correction has already been applied.
      null;
    else
      raise exception 'Unexpected outcome audit definition: %', r.signature;
    end if;
  end loop;
end;
$fix$;

commit;
