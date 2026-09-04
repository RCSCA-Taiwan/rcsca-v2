-- Canonical export recovered read-only from Staging migration history.
-- Version: 20260830212859; name: harden_function_execution

-- Tighten SECURITY DEFINER execution boundaries.
-- Helper functions are intended for RLS evaluation, not direct public RPC use.

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.is_admin(text) from public, anon, authenticated;
revoke all on function public.is_enterprise_user(uuid) from public, anon, authenticated;

-- Verification RPC is callable only by signed-in users; the function body must enforce admin role.
revoke all on function public.admin_verify_participation(uuid, boolean, text) from public, anon;
grant execute on function public.admin_verify_participation(uuid, boolean, text) to authenticated;

-- Ensure the verification RPC cannot be used by an ordinary signed-in account.
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
