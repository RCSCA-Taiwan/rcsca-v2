-- Canonical export recovered from Production migration history.
-- Version: 20261001124613; name: v1500_enterprise_share_review_lifecycle

create or replace function public.admin_review_enterprise_share(
  p_share_id uuid,
  p_decision text,
  p_public_result boolean default false,
  p_note text default null
) returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_actor uuid := auth.uid();
  v_share public.enterprise_shares%rowtype;
  v_status public.review_status;
begin
  if v_actor is null or not (private.is_admin('enterprise_reviewer') or private.is_admin('admin')) then raise exception 'insufficient_privilege'; end if;
  if p_decision is null or p_decision not in ('approved','needs_info','rejected') then raise exception 'invalid_decision'; end if;
  v_status := p_decision::public.review_status;
  select * into v_share from public.enterprise_shares where id=p_share_id for update;
  if not found then raise exception 'share_not_found'; end if;
  if v_share.status not in ('submitted','under_review') then raise exception 'invalid_status_transition'; end if;
  if v_status='needs_info' and nullif(trim(coalesce(p_note,'')),'') is null then raise exception 'note_required'; end if;

  update public.enterprise_shares
  set status=v_status,
      public_result=case when v_status='approved' then coalesce(p_public_result,false) else false end
  where id=p_share_id;

  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'admin','review_enterprise_share','enterprise_share',p_share_id::text,coalesce(p_note,p_decision));

  insert into public.user_notifications(recipient_user_id,kind,title,body,related_type,related_id)
  select eu.user_id,'enterprise_share_review',
    case when v_status='approved' then '企業共享內容已核准' when v_status='needs_info' then '企業共享內容需要補充資料' else '企業共享內容未通過' end,
    coalesce(p_note,'請進入企業管理入口查看目前狀態。'),'enterprise_share',p_share_id
  from public.enterprise_users eu where eu.enterprise_id=v_share.enterprise_id
  on conflict (recipient_user_id,kind,related_type,related_id) where related_id is not null
  do update set title=excluded.title,body=excluded.body,read_at=null,created_at=now();
end;
$$;
revoke all on function public.admin_review_enterprise_share(uuid,text,boolean,text) from public,anon;
grant execute on function public.admin_review_enterprise_share(uuid,text,boolean,text) to authenticated;
