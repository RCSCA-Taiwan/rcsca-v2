-- Saves content only. Publication, consent, status and source are unchanged.
begin;
create or replace function public.admin_save_cycle_story_draft(
  p_story_id uuid,
  p_title text,
  p_summary text,
  p_expected_updated_at timestamptz
) returns timestamptz
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_role text;
  v_story public.cycle_stories%rowtype;
  v_updated_at timestamptz;
begin
  if v_actor is null or not private.is_admin('outcome_reviewer') then
    raise exception 'outcome_reviewer_required';
  end if;
  if nullif(trim(p_title), '') is null or nullif(trim(p_summary), '') is null then
    raise exception 'title_and_summary_required';
  end if;
  if char_length(trim(p_title)) > 200 or char_length(trim(p_summary)) > 10000 then
    raise exception 'cycle_story_content_too_long';
  end if;
  select * into v_story from public.cycle_stories where id = p_story_id for update;
  if not found then raise exception 'cycle_story_not_found'; end if;
  if v_story.status not in ('draft', 'submitted', 'needs_info') or v_story.published_at is not null then
    raise exception 'invalid_cycle_story_status';
  end if;
  if p_expected_updated_at is null or v_story.updated_at is distinct from p_expected_updated_at then
    raise exception 'cycle_story_changed';
  end if;
  if v_story.title = trim(p_title) and v_story.summary = trim(p_summary) then
    return v_story.updated_at;
  end if;
  select ar.role_key into v_role from public.admin_roles ar
    where ar.user_id = v_actor and ar.role_key in ('super_admin', 'outcome_reviewer')
    order by case ar.role_key when 'super_admin' then 1 else 2 end limit 1;
  if v_role is null then raise exception 'outcome_reviewer_required'; end if;
  update public.cycle_stories set title = trim(p_title), summary = trim(p_summary),
    updated_at = greatest(clock_timestamp(), v_story.updated_at + interval '1 microsecond')
    where id = p_story_id returning updated_at into v_updated_at;
  insert into public.audit_logs(actor_user_id, actor_role, action, subject_type, subject_id, note)
    values (v_actor, v_role, 'save_cycle_story_draft', 'cycle_story', p_story_id::text,
      '後台編輯草稿；未公開發布');
  return v_updated_at;
end;
$function$;
revoke all on function public.admin_save_cycle_story_draft(uuid, text, text, timestamptz) from public, anon;
grant execute on function public.admin_save_cycle_story_draft(uuid, text, text, timestamptz) to authenticated;
comment on function public.admin_save_cycle_story_draft(uuid, text, text, timestamptz)
  is 'Outcome reviewer content-only draft save with optimistic concurrency and actual actor role audit.';
commit;
