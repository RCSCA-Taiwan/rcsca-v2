-- V1182: normalize outcome RPC signatures used by the current application.

create or replace function public.admin_generate_outcome_drafts(
  p_queue_id uuid,
  p_story_title text default null,
  p_story_summary text default null,
  p_esg_title text default null,
  p_esg_summary text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_actor uuid := auth.uid();
  v_queue public.outcome_review_queue%rowtype;
  v_story uuid;
  v_esg uuid;
begin
  if v_actor is null or not private.is_admin('outcome_reviewer') then
    raise exception 'outcome_reviewer_required';
  end if;
  select * into v_queue from public.outcome_review_queue
  where id=p_queue_id for update;
  if not found then raise exception 'outcome_queue_not_found'; end if;
  if v_queue.status='under_review' then
    select id into v_story from public.cycle_stories
    where source_type=v_queue.source_type and source_id=v_queue.source_id limit 1;
    select id into v_esg from public.enterprise_esg_assets
    where source_type=v_queue.source_type and source_id=v_queue.source_id
      and enterprise_id=v_queue.enterprise_id limit 1;
    return jsonb_build_object('story_id',v_story,'esg_asset_id',v_esg);
  end if;
  if v_queue.status not in ('draft','submitted','needs_info') then
    raise exception 'invalid_outcome_queue_status';
  end if;

  if v_queue.proposed_story then
    select id into v_story from public.cycle_stories
    where source_type=v_queue.source_type and source_id=v_queue.source_id limit 1;
    if v_story is null then
      insert into public.cycle_stories(
        title,summary,role_flow,source_type,source_id,status,
        consent_confirmed,anonymized,created_by
      ) values (
        coalesce(nullif(trim(p_story_title),''),'善循環案例草稿'),
        coalesce(nullif(trim(p_story_summary),''),
          '待人工整理：此內容由已完成成果建立草稿，尚未取得公開核准。'),
        array['共享者','RCSCA','受益者'],v_queue.source_type,v_queue.source_id,
        'draft',false,false,v_actor
      ) returning id into v_story;
    end if;
  end if;

  if v_queue.proposed_esg_asset and v_queue.enterprise_id is not null then
    select id into v_esg from public.enterprise_esg_assets
    where source_type=v_queue.source_type and source_id=v_queue.source_id
      and enterprise_id=v_queue.enterprise_id limit 1;
    if v_esg is null then
      insert into public.enterprise_esg_assets(
        enterprise_id,title,asset_type,period_label,summary,
        source_type,source_id,status,created_by
      ) values (
        v_queue.enterprise_id,
        coalesce(nullif(trim(p_esg_title),''),'ESG 成果素材草稿'),
        'impact_summary',to_char(current_date,'YYYY'),
        coalesce(nullif(trim(p_esg_summary),''),
          '待人工整理：由已完成合作建立的企業成果素材草稿。'),
        v_queue.source_type,v_queue.source_id,'draft',v_actor
      ) returning id into v_esg;
    end if;
  end if;

  update public.outcome_review_queue
  set status='under_review',review_note='已建立成果草稿，等待人工確認',updated_at=now()
  where id=p_queue_id;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'outcome_reviewer','generate_outcome_drafts',
    'outcome_review_queue',p_queue_id::text,
    concat('story=',coalesce(v_story::text,'-'),'; esg=',coalesce(v_esg::text,'-')));
  return jsonb_build_object('story_id',v_story,'esg_asset_id',v_esg);
end $$;

drop function if exists public.admin_publish_cycle_story(uuid,boolean,text);

revoke all on function public.admin_generate_outcome_drafts(uuid,text,text,text,text)
from public,anon;
grant execute on function public.admin_generate_outcome_drafts(uuid,text,text,text,text)
to authenticated;
