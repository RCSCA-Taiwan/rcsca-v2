-- Canonical export recovered from Production migration history.
-- Version: 20261001081835; name: v1460_participation_review_once

create or replace function public.admin_verify_participation(
  p_participation_id uuid,
  p_approved boolean,
  p_note text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_part public.activity_participations%rowtype;
begin
  if v_actor is null or not exists (
    select 1 from public.admin_roles ar
    where ar.user_id = v_actor
      and ar.role_key in ('super_admin','admin','activity_reviewer')
  ) then
    raise exception 'insufficient_privilege';
  end if;

  select * into v_part
  from public.activity_participations
  where id = p_participation_id
  for update;

  if not found then
    raise exception 'participation_not_found';
  end if;

  if v_part.status <> 'pending' then
    raise exception 'participation_already_reviewed';
  end if;

  update public.activity_participations
  set status = case when p_approved then 'verified'::public.verification_status else 'rejected'::public.verification_status end,
      verified_by = v_actor,
      verified_at = now()
  where id = p_participation_id;

  insert into public.audit_logs(actor_user_id, actor_role, action, subject_type, subject_id, note)
  values (v_actor, 'activity_reviewer', case when p_approved then 'verify' else 'reject' end,
          'activity_participation', p_participation_id::text, p_note);

  if p_approved then
    insert into public.sharing_footprints(user_id, footprint_type, source_type, source_id, description)
    values (v_part.user_id, 'care', 'activity_participation', p_participation_id,
            '公益行動完成參與並經核實');
  end if;
end;
$$;

