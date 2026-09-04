-- Canonical export recovered read-only from Staging migration history.
-- Version: 20260831063809; name: workflow_completion

-- V170: enterprise resubmission + network match administration
alter table public.network_match_responses add column if not exists reviewed_by uuid references public.profiles(id), add column if not exists reviewed_at timestamptz, add column if not exists admin_note text;

create policy "enterprise users create own shares" on public.enterprise_shares for insert to authenticated
with check (private.is_enterprise_user(enterprise_id) and status='submitted' and public_result=false);
create policy "enterprise users update needs info shares" on public.enterprise_shares for update to authenticated
using (private.is_enterprise_user(enterprise_id) and status='needs_info')
with check (private.is_enterprise_user(enterprise_id) and status='submitted' and public_result=false);

create or replace function public.admin_review_network_response(p_response_id uuid,p_decision text,p_note text default null) returns void
language plpgsql security definer set search_path=public,private as $$
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
 insert into public.notifications(user_id,kind,title,body,link_path) values(v_responder,'network','媒合狀態已更新','你的 1% Network 回應狀態已更新。','/1percent-network/matches'),(v_owner,'network','媒合進度已更新','你的 1% Network 需求有新的媒合進度。','/1percent-network/matches');
end;$$;
revoke all on function public.admin_review_network_response(uuid,text,text) from public,anon;
grant execute on function public.admin_review_network_response(uuid,text,text) to authenticated;
