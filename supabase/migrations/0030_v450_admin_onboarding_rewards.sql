-- V450: close two operational gaps: enterprise onboarding review and reward redemption settlement.
-- Reward settlement is atomic and never changes XP.

create or replace function public.admin_review_enterprise_application(
  p_application_id uuid,
  p_decision public.review_status,
  p_note text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare a public.enterprise_applications%rowtype; v_uid uuid:=auth.uid(); v_ent uuid;
begin
  if not public.is_admin() then raise exception 'admin required'; end if;
  if p_decision not in ('approved','needs_info','rejected') then raise exception 'invalid decision'; end if;
  select * into a from public.enterprise_applications where id=p_application_id for update;
  if not found then raise exception 'application not found'; end if;
  v_ent:=a.enterprise_id;
  if p_decision='approved' then
    if v_ent is null then
      insert into public.enterprises(tax_id,legal_name,display_name,region,status)
      values(a.tax_id,a.company_name,a.company_name,a.region,'approved')
      on conflict(tax_id) do update set status='approved',updated_at=now()
      returning id into v_ent;
    else
      update public.enterprises set status='approved',updated_at=now() where id=v_ent;
    end if;
    insert into public.enterprise_users(enterprise_id,user_id,role)
    values(v_ent,a.requester_user_id,'manager') on conflict(enterprise_id,user_id) do nothing;
  end if;
  update public.enterprise_applications set enterprise_id=v_ent,status=p_decision,review_note=p_note,updated_at=now() where id=p_application_id;
  insert into public.user_notifications(user_id,kind,title,body,related_type,related_id)
  values(a.requester_user_id,'enterprise_application','企業加入申請已更新',case p_decision when 'approved' then '企業身份已核准並連結到你的帳號。' when 'needs_info' then 'RCSCA 需要你補充企業申請資料。' else '本次企業加入申請未通過。' end,'enterprise_application',p_application_id);
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_uid,'admin','enterprise_application_'||p_decision::text,'enterprise_application',p_application_id::text,p_note);
  return coalesce(v_ent,a.enterprise_id);
end;$$;
grant execute on function public.admin_review_enterprise_application(uuid,public.review_status,text) to authenticated;

create or replace function public.admin_review_reward_redemption(
  p_redemption_id uuid,
  p_decision public.review_status,
  p_note text default null
) returns void language plpgsql security definer set search_path=public as $$
declare r public.reward_redemptions%rowtype; c public.reward_catalog%rowtype; v_uid uuid:=auth.uid(); v_balance integer; v_code text;
begin
  if not public.is_admin() then raise exception 'admin required'; end if;
  if p_decision not in ('approved','rejected','completed') then raise exception 'invalid decision'; end if;
  select * into r from public.reward_redemptions where id=p_redemption_id for update;
  if not found then raise exception 'redemption not found'; end if;
  select * into c from public.reward_catalog where id=r.reward_id for update;
  if p_decision='approved' and r.status<>'approved' then
    select coalesce(sum(points),0) into v_balance from public.point_transactions where user_id=r.user_id;
    if v_balance < r.point_cost then raise exception 'insufficient points'; end if;
    if c.stock_remaining is not null and c.stock_remaining<=0 then raise exception 'out of stock'; end if;
    insert into public.point_transactions(user_id,tx_type,points,source_type,source_id,description,created_by)
    values(r.user_id,'spend',-r.point_cost,'reward_redemption',r.id,'共享所兌換｜'||c.title,v_uid);
    if c.stock_remaining is not null then update public.reward_catalog set stock_remaining=stock_remaining-1,updated_at=now() where id=c.id; end if;
    v_code:=upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
    update public.reward_redemptions set status='approved',redemption_code=coalesce(redemption_code,v_code),updated_at=now() where id=r.id;
  elsif p_decision='rejected' then
    update public.reward_redemptions set status='rejected',updated_at=now() where id=r.id;
  elsif p_decision='completed' then
    if r.status<>'approved' then raise exception 'approve before completion'; end if;
    update public.reward_redemptions set status='completed',updated_at=now() where id=r.id;
  end if;
  insert into public.user_notifications(user_id,kind,title,body,related_type,related_id)
  values(r.user_id,'reward_redemption','共享所兌換狀態已更新',case p_decision when 'approved' then '兌換已核准，共享點已扣除並產生兌換碼。' when 'completed' then '這筆共享回饋已完成核銷。' else '這筆兌換申請未通過，未扣除共享點。' end,'reward_redemption',r.id);
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_uid,'admin','reward_redemption_'||p_decision::text,'reward_redemption',r.id::text,p_note);
end;$$;
grant execute on function public.admin_review_reward_redemption(uuid,public.review_status,text) to authenticated;
