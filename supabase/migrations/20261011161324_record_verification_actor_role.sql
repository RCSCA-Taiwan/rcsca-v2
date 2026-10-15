begin;

create or replace function public.admin_verify_participation(
  p_participation_id uuid,
  p_approved boolean,
  p_note text default null::text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_actor uuid := auth.uid();
  v_actor_role text;
  v_part public.activity_participations%rowtype;
begin
  select ar.role_key::text
  into v_actor_role
  from public.admin_roles ar
  where ar.user_id = v_actor
    and ar.role_key in ('super_admin', 'admin', 'activity_reviewer')
  order by case ar.role_key
    when 'super_admin' then 1
    when 'admin' then 2
    when 'activity_reviewer' then 3
  end
  limit 1;

  if v_actor is null or v_actor_role is null then
    raise exception 'insufficient_privilege';
  end if;

  select *
  into v_part
  from public.activity_participations
  where id = p_participation_id
  for update;

  if not found then
    raise exception 'participation_not_found';
  end if;

  if v_part.status <> 'pending' then
    raise exception 'participation_already_reviewed';
  end if;

  if p_approved then
    perform 1
    from public.activities
    where id = v_part.activity_id
      and status = 'completed'
    for share;

    if not found then
      raise exception 'activity_not_completed';
    end if;
  end if;

  update public.activity_participations
  set
    status = case
      when p_approved then 'verified'::public.verification_status
      else 'rejected'::public.verification_status
    end,
    verified_by = v_actor,
    verified_at = now()
  where id = p_participation_id;

  insert into public.audit_logs (
    actor_user_id, actor_role, action,
    subject_type, subject_id, note
  )
  values (
    v_actor,
    v_actor_role,
    case when p_approved then 'verify' else 'reject' end,
    'activity_participation',
    p_participation_id::text,
    p_note
  );

  if p_approved then
    insert into public.sharing_footprints (
      user_id, footprint_type, source_type, source_id, description
    )
    values (
      v_part.user_id,
      'care',
      'activity_participation',
      p_participation_id,
      '公益行動完成參與並經核實'
    );
  end if;
end;
$function$;

commit;
