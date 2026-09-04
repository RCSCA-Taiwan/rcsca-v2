-- V460: identity verification request, membership operations, and participation status visibility.
-- Identity verification stores only a one-way hash token in this staging workflow; raw ID numbers are never persisted here.

create or replace function public.request_identity_verification(
  p_verification_kind text,
  p_identity_token text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_id uuid; v_hash text;
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  if coalesce(trim(p_verification_kind),'')='' then raise exception 'verification kind required'; end if;
  v_hash:=case when nullif(trim(coalesce(p_identity_token,'')),'') is null then null else encode(digest(trim(p_identity_token),'sha256'),'hex') end;
  insert into public.identity_verifications(user_id,verification_kind,identity_token_hash,status,verified_at,verified_by)
  values(v_uid,trim(p_verification_kind),v_hash,'pending',null,null)
  on conflict(user_id,verification_kind) do update set identity_token_hash=excluded.identity_token_hash,status='pending',verified_at=null,verified_by=null,created_at=now()
  returning id into v_id;
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_uid,'user','identity_verification_requested','identity_verification',v_id::text,trim(p_verification_kind));
  return v_id;
end;$$;
grant execute on function public.request_identity_verification(text,text) to authenticated;

create or replace function public.admin_review_identity_verification(
  p_verification_id uuid,
  p_approved boolean,
  p_note text default null
) returns void language plpgsql security definer set search_path=public as $$
declare v public.identity_verifications%rowtype; v_uid uuid:=auth.uid();
begin
  if not public.is_admin() then raise exception 'admin required'; end if;
  select * into v from public.identity_verifications where id=p_verification_id for update;
  if not found then raise exception 'verification not found'; end if;
  update public.identity_verifications set status=case when p_approved then 'verified' else 'rejected' end,
    verified_at=case when p_approved then now() else null end, verified_by=v_uid where id=p_verification_id;
  insert into public.user_notifications(user_id,kind,title,body,related_type,related_id)
  values(v.user_id,'identity_verification','身份驗證狀態已更新',case when p_approved then '你的身份驗證已完成。' else '身份驗證未通過，請確認資料後重新提出。' end,'identity_verification',p_verification_id);
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_uid,'admin',case when p_approved then 'identity_verified' else 'identity_rejected' end,'identity_verification',p_verification_id::text,p_note);
end;$$;
grant execute on function public.admin_review_identity_verification(uuid,boolean,text) to authenticated;

create or replace function public.admin_set_membership(
  p_user_id uuid,
  p_membership_type public.membership_type,
  p_member_since date default current_date,
  p_member_number text default null,
  p_status text default 'active',
  p_note text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_id uuid;
begin
  if not public.is_admin() then raise exception 'admin required'; end if;
  if not exists(select 1 from public.profiles where id=p_user_id) then raise exception 'profile not found'; end if;
  insert into public.memberships(user_id,membership_type,member_since,member_number,status)
  values(p_user_id,p_membership_type,p_member_since,nullif(trim(coalesce(p_member_number,'')),''),coalesce(nullif(trim(p_status),''),'active'))
  on conflict(user_id) do update set membership_type=excluded.membership_type,member_since=excluded.member_since,member_number=coalesce(excluded.member_number,public.memberships.member_number),status=excluded.status,updated_at=now()
  returning id into v_id;
  insert into public.user_notifications(user_id,kind,title,body,related_type,related_id)
  values(p_user_id,'membership','RCSCA 會員身份已更新','你的正式會員身份已由協會更新，可在「身份與使用權限」查看。','membership',v_id);
  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_uid,'admin','membership_updated','membership',v_id::text,p_note);
  return v_id;
end;$$;
grant execute on function public.admin_set_membership(uuid,public.membership_type,date,text,text,text) to authenticated;

-- Admins need a review queue; members still only see their own verification record.
drop policy if exists "identity verification admin queue read" on public.identity_verifications;
create policy "identity verification admin queue read" on public.identity_verifications for select to authenticated using (user_id=auth.uid() or public.is_admin());
