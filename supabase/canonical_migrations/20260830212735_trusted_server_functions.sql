-- Canonical export recovered read-only from Staging migration history.
-- Version: 20260830212735; name: trusted_server_functions

create or replace function public.admin_verify_participation(p_participation_id uuid, p_approved boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare p public.activity_participations;
begin
  if not public.is_admin() then raise exception 'not authorized'; end if;
  select * into p from public.activity_participations where id = p_participation_id for update;
  if not found then raise exception 'participation not found'; end if;
  update public.activity_participations
  set status = case when p_approved then 'verified'::public.verification_status else 'rejected'::public.verification_status end,
      verified_by = auth.uid(), verified_at = now()
  where id = p_participation_id;
  if p_approved and not exists (select 1 from public.sharing_footprints f where f.source_type='activity_participation' and f.source_id=p_participation_id) then
    insert into public.sharing_footprints(user_id,footprint_type,source_type,source_id,description)
    values(p.user_id,'care','activity_participation',p_participation_id,coalesce(p_note,'活動完成參與'));
  end if;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(auth.uid(),'admin','verify_participation','activity_participation',p_participation_id::text,p_note);
end;
$$;
