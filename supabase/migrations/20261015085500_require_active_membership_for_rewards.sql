-- Membership is required at request and approval; point earning remains independent.
create or replace function public.reward_submit_redemption(p_reward_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_reward public.reward_catalog%rowtype; v_id uuid; v_points integer; v_level integer; v_footprints integer;
begin
  if v_actor is null then raise exception 'authentication_required'; end if;
  -- Serialize submissions by the same account, including duplicate requests.
  perform 1 from public.profiles where id=v_actor for no key update;
  if not found then raise exception 'member_profile_not_found'; end if;
  perform 1 from public.memberships where user_id=v_actor and status='active' for share;
  if not found then raise exception 'active_membership_required'; end if;
  select * into v_reward from public.reward_catalog where id=p_reward_id and status='approved' for share;
  if not found then raise exception 'reward_not_available'; end if;
  if v_reward.starts_at is not null and v_reward.starts_at>now() then raise exception 'reward_not_started'; end if;
  if v_reward.ends_at is not null and v_reward.ends_at<=now() then raise exception 'reward_ended'; end if;
  if v_reward.stock_remaining is not null and v_reward.stock_remaining<=0 then raise exception 'reward_out_of_stock'; end if;
  select coalesce(sum(points),0)::int into v_points from public.point_transactions where user_id=v_actor;
  select coalesce(level,1) into v_level from public.member_levels where user_id=v_actor;
  if v_level is null then v_level:=1; end if;
  select count(*)::int into v_footprints from public.sharing_footprints where user_id=v_actor;
  if v_points<v_reward.point_cost or v_level<coalesce(v_reward.min_level,1) or v_footprints<v_reward.min_footprints then raise exception 'eligibility_not_met'; end if;
  if exists(select 1 from public.reward_redemptions where reward_id=p_reward_id and user_id=v_actor and status in ('submitted','under_review','approved')) then raise exception 'existing_redemption_pending'; end if;
  insert into public.reward_redemptions(reward_id,user_id,point_cost,status) values(p_reward_id,v_actor,v_reward.point_cost,'submitted') returning id into v_id;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(v_actor,'member','submit_reward_redemption','reward_redemption',v_id::text,'會員提出共享所兌換申請');
  return v_id;
end;$$;
revoke all on function public.reward_submit_redemption(uuid) from public,anon;
grant execute on function public.reward_submit_redemption(uuid) to authenticated;


CREATE OR REPLACE FUNCTION public.admin_review_reward_redemption(p_redemption_id uuid, p_decision review_status, p_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
declare v_redemption public.reward_redemptions%rowtype; v_reward public.reward_catalog%rowtype; v_actor uuid:=auth.uid(); v_balance integer; v_code text;
begin
  if not private.is_admin(null) then raise exception 'admin_required'; end if;
  if p_decision is null or p_decision not in ('approved','rejected','completed') then raise exception 'invalid_decision'; end if;
  select * into v_redemption from public.reward_redemptions where id=p_redemption_id for update;
  if not found then raise exception 'redemption_not_found'; end if;
  -- Serialize a member's balance across different rewards before inventory locking.
  if p_decision='approved' then
    perform 1 from public.profiles where id=v_redemption.user_id for no key update;
    if not found then raise exception 'member_profile_not_found'; end if;
    -- Keep membership changes from racing approval in this transaction.
    perform 1 from public.memberships where user_id=v_redemption.user_id and status='active' for share;
    if not found then raise exception 'active_membership_required'; end if;
  end if;
  select * into v_reward from public.reward_catalog where id=v_redemption.reward_id for update;
  if not found then raise exception 'reward_not_found'; end if;
  if p_decision in ('approved','rejected') and v_redemption.status<>'submitted' then raise exception 'invalid_status_transition'; end if;
  if p_decision='completed' and v_redemption.status<>'approved' then raise exception 'invalid_status_transition'; end if;
  if p_decision='approved' then
    if v_reward.status<>'approved' then raise exception 'reward_not_available'; end if;
    if v_reward.starts_at is not null and v_reward.starts_at>now() then raise exception 'reward_not_started'; end if;
    if v_reward.ends_at is not null and v_reward.ends_at<=now() then raise exception 'reward_ended'; end if;
    select coalesce(sum(points),0) into v_balance from public.point_transactions where user_id=v_redemption.user_id;
    if v_balance<v_redemption.point_cost then raise exception 'insufficient_points'; end if;
    if v_reward.stock_remaining is not null and v_reward.stock_remaining<=0 then raise exception 'out_of_stock'; end if;
    insert into public.point_transactions(user_id,tx_type,points,source_type,source_id,description,created_by)
    values(v_redemption.user_id,'spend',-v_redemption.point_cost,'reward_redemption',v_redemption.id,'共享所兌換｜'||v_reward.title,v_actor);
    if v_reward.stock_remaining is not null then
      update public.reward_catalog set stock_remaining=stock_remaining-1,updated_at=now() where id=v_reward.id;
    end if;
    v_code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
    update public.reward_redemptions set status='approved',redemption_code=coalesce(redemption_code,v_code),updated_at=now() where id=v_redemption.id;
  elsif p_decision='rejected' then
    update public.reward_redemptions set status='rejected',updated_at=now() where id=v_redemption.id;
  else
    update public.reward_redemptions set status='completed',updated_at=now() where id=v_redemption.id;
  end if;
  insert into public.user_notifications(recipient_user_id,kind,title,body,related_type,related_id)
  values(v_redemption.user_id,'reward_redemption','共享所兌換狀態已更新',
    case p_decision when 'approved' then '兌換已核准，共享點已扣除並產生兌換碼。'
      when 'completed' then '這筆共享回饋已完成核銷。' else '這筆兌換申請未通過，未扣除共享點。' end,
    'reward_redemption',v_redemption.id)
  on conflict (recipient_user_id,kind,related_type,related_id) where related_id is not null
  do update set title=excluded.title,body=excluded.body,read_at=null,created_at=now();
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'admin','reward_redemption_'||p_decision::text,'reward_redemption',v_redemption.id::text,p_note);
end;$function$;
