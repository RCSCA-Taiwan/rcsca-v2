-- V1300: three admin RPCs still targeted the removed public.notifications
-- table. Route them to the canonical user_notifications table.

create or replace function public.admin_review_network_response(
  p_response_id uuid,p_decision text,p_note text default null
) returns void language plpgsql security definer set search_path=public,private as $$
declare v_actor uuid:=auth.uid(); v_req uuid; v_responder uuid; v_owner uuid;
begin
 if v_actor is null or not exists(select 1 from public.admin_roles where user_id=v_actor and role_key in ('super_admin','admin','network_manager')) then raise exception 'insufficient_privilege'; end if;
 if p_decision not in ('approved','needs_info','rejected','completed') then raise exception 'invalid_decision'; end if;
 select r.request_id,r.responder_user_id,n.requester_user_id into v_req,v_responder,v_owner from public.network_match_responses r join public.network_requests n on n.id=r.request_id where r.id=p_response_id for update;
 if not found then raise exception 'response_not_found'; end if;
 update public.network_match_responses set status=p_decision::public.review_status,reviewed_by=v_actor,reviewed_at=now(),admin_note=p_note where id=p_response_id;
 if p_decision='approved' then update public.network_requests set status='matched',updated_at=now() where id=v_req and status not in ('completed','cancelled'); end if;
 if p_decision='completed' then update public.network_requests set status='completed',updated_at=now() where id=v_req; end if;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(v_actor,'network_manager','network_response_'||p_decision,'network_match_response',p_response_id::text,p_note);
 insert into public.user_notifications(recipient_user_id,kind,title,body,related_type,related_id) values
   (v_responder,'network','媒合狀態已更新','你的 1% Network 回應狀態已更新。','network_response',p_response_id),
   (v_owner,'network','媒合進度已更新','你的 1% Network 需求有新的媒合進度。','network_response',p_response_id);
end;$$;

create or replace function public.admin_issue_enterprise_badge(
  p_enterprise_id uuid,p_year integer,p_badge_label text default '1% PARTNER',p_expires_at timestamptz default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_badge uuid;
begin
  if v_actor is null or not private.is_admin('admin') then raise exception 'insufficient_privilege'; end if;
  if p_year < 2018 or p_year > extract(year from now())::int + 1 then raise exception 'invalid_badge_year'; end if;
  if not exists(select 1 from public.enterprises where id=p_enterprise_id and status='approved') then raise exception 'enterprise_not_approved'; end if;
  insert into public.enterprise_badges(enterprise_id,year,badge_label,issued_at,expires_at,status)
  values(p_enterprise_id,p_year,coalesce(nullif(trim(p_badge_label),''),'1% PARTNER'),now(),p_expires_at,'issued')
  on conflict(enterprise_id,year) do update set badge_label=excluded.badge_label,issued_at=now(),expires_at=excluded.expires_at,status='issued'
  returning id into v_badge;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'admin','issue_enterprise_badge','enterprise_badge',v_badge::text,'年度 1% 標章已核發');
  insert into public.user_notifications(recipient_user_id,kind,title,body,related_type,related_id)
  select eu.user_id,'enterprise_badge','年度 1% 標章已核發',p_year::text||' 年度企業共享標章已核發。','enterprise_badge',v_badge
  from public.enterprise_users eu where eu.enterprise_id=p_enterprise_id;
  return v_badge;
end;$$;

create or replace function public.admin_revoke_enterprise_badge(
  p_badge_id uuid,p_note text default null
) returns void language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_enterprise uuid;
begin
  if v_actor is null or not private.is_admin('admin') then raise exception 'insufficient_privilege'; end if;
  update public.enterprise_badges set status='revoked',expires_at=coalesce(expires_at,now())
  where id=p_badge_id returning enterprise_id into v_enterprise;
  if v_enterprise is null then raise exception 'badge_not_found'; end if;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'admin','revoke_enterprise_badge','enterprise_badge',p_badge_id::text,coalesce(p_note,'年度標章已撤回'));
  insert into public.user_notifications(recipient_user_id,kind,title,body,related_type,related_id)
  select eu.user_id,'enterprise_badge','年度 1% 標章狀態更新','企業年度共享標章已由 RCSCA 更新，請至企業管理入口查看。','enterprise_badge',p_badge_id
  from public.enterprise_users eu where eu.enterprise_id=v_enterprise;
end;$$;

revoke all on function public.admin_review_network_response(uuid,text,text) from public,anon;
grant execute on function public.admin_review_network_response(uuid,text,text) to authenticated;
revoke all on function public.admin_issue_enterprise_badge(uuid,integer,text,timestamptz) from public,anon;
grant execute on function public.admin_issue_enterprise_badge(uuid,integer,text,timestamptz) to authenticated;
revoke all on function public.admin_revoke_enterprise_badge(uuid,text) from public,anon;
grant execute on function public.admin_revoke_enterprise_badge(uuid,text) to authenticated;
