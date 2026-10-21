-- Close the reviewed personal-data request lifecycle with one guarded, atomic executor.
-- Historical membership, donation, activity and audit records are retained; reset/delete
-- operate on current profile state and user-facing progress rather than hard-deleting profiles.

alter table private.personal_data_requests
  add column if not exists executed_by uuid references public.profiles(id),
  add column if not exists executed_at timestamptz,
  add column if not exists execution_summary jsonb;

create table if not exists private.member_contact_details (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  contact_email text,
  address text,
  updated_at timestamptz not null default now(),
  check (contact_email is null or length(contact_email) <= 254),
  check (address is null or length(address) <= 500)
);
alter table private.member_contact_details enable row level security;
revoke all on private.member_contact_details from public,anon,authenticated;

-- Seed the current-contact snapshot from the latest approved membership application only.
insert into private.member_contact_details(user_id,contact_email,address,updated_at)
select distinct on (a.user_id) a.user_id,a.email,a.address,coalesce(a.reviewed_at,a.created_at)
from private.membership_applications a
where a.status='approved'
order by a.user_id,coalesce(a.reviewed_at,a.created_at) desc
on conflict(user_id) do nothing;

create or replace function public.personal_data_requests_self()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'authentication_required';end if;
 return coalesce((
   select jsonb_agg(to_jsonb(r)-'reviewed_by'-'executed_by' order by r.created_at desc)
   from private.personal_data_requests r where r.user_id=auth.uid()
 ),'[]'::jsonb);
end;$$;

create or replace function public.admin_personal_data_request_review(
  p_request uuid,p_decision text,p_note text,p_execution_confirmed boolean default false
)
returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_row private.personal_data_requests%rowtype;
begin
 if v_actor is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 if coalesce(length(trim(p_note)),0) not between 1 and 1000 then raise exception 'review_note_required';end if;
 select * into v_row from private.personal_data_requests where id=p_request for update;
 if not found then raise exception 'request_not_found';end if;
 if v_row.user_id=v_actor then raise exception 'cannot_review_own_request';end if;
 if p_decision='completed' then raise exception 'execution_requires_executor';end if;
 if p_decision is null or not (
   (v_row.status='submitted' and p_decision in ('needs_info','approved','rejected')) or
   (v_row.status='needs_info' and p_decision='rejected') or
   (v_row.status='approved' and p_decision in ('processing','rejected'))
 ) then raise exception 'invalid_status_transition';end if;
 update private.personal_data_requests
 set status=p_decision,review_note=trim(p_note),reviewed_by=v_actor,updated_at=now()
 where id=p_request;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
 values(v_actor,'admin','personal_data_request_'||p_decision,'personal_data_request',p_request::text,trim(p_note));
end;$$;

create or replace function public.admin_personal_data_request_execute(p_request uuid,p_note text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_actor uuid:=auth.uid();
  v_row private.personal_data_requests%rowtype;
  v_points integer:=0;
  v_summary jsonb:='{}'::jsonb;
  v_contact private.member_contact_details%rowtype;
begin
 if v_actor is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 if coalesce(length(trim(p_note)),0) not between 1 and 1000 then raise exception 'execution_note_required';end if;
 select * into v_row from private.personal_data_requests where id=p_request for update;
 if not found then raise exception 'request_not_found';end if;
 if v_row.user_id=v_actor then raise exception 'cannot_execute_own_request';end if;
 if v_row.status not in ('approved','processing') then raise exception 'request_not_executable';end if;
 if v_row.request_kind in ('reset','delete') and (not v_row.confirmation_one or not v_row.confirmation_two) then raise exception 'two_confirmations_required';end if;

 update private.personal_data_requests set status='processing',updated_at=now() where id=p_request;

 if v_row.request_kind='edit' then
   update public.profiles p set
     display_name=case when v_row.requested_changes ? 'display_name' then nullif(trim(v_row.requested_changes->>'display_name'),'') else p.display_name end,
     mobile=case when v_row.requested_changes ? 'mobile' then nullif(trim(v_row.requested_changes->>'mobile'),'') else p.mobile end,
     updated_at=now()
   where p.id=v_row.user_id;

   select * into v_contact from private.member_contact_details where user_id=v_row.user_id;
   if v_row.requested_changes ? 'contact_email' or v_row.requested_changes ? 'address' then
     insert into private.member_contact_details(user_id,contact_email,address,updated_at)
     values(
       v_row.user_id,
       case when v_row.requested_changes ? 'contact_email' then nullif(trim(v_row.requested_changes->>'contact_email'),'') else v_contact.contact_email end,
       case when v_row.requested_changes ? 'address' then nullif(trim(v_row.requested_changes->>'address'),'') else v_contact.address end,
       now()
     )
     on conflict(user_id) do update set
       contact_email=excluded.contact_email,address=excluded.address,updated_at=excluded.updated_at;
   end if;
   v_summary:=jsonb_build_object('kind','edit','profile_updated',true,'membership_history_retained',true);
 else
   -- Zero the spendable balance without deleting the point ledger.
   select coalesce(sum(points),0)::integer into v_points
   from public.point_transactions where user_id=v_row.user_id;
   if v_points<>0 then
     insert into public.point_transactions(user_id,tx_type,points,source_type,source_id,description,created_by)
     values(v_row.user_id,'adjust',-v_points,'personal_data_'||v_row.request_kind,p_request,'依已核准個人資料申請將可用積分歸零',v_actor);
   end if;

   insert into public.member_levels(user_id,level,lifetime_xp,updated_at)
   values(v_row.user_id,1,0,now())
   on conflict(user_id) do update set level=1,lifetime_xp=0,updated_at=now();

   delete from public.sharing_footprints where user_id=v_row.user_id;
   delete from private.member_birthdays where user_id=v_row.user_id;
   delete from private.member_contact_details where user_id=v_row.user_id;
   delete from public.my_one_preferences where user_id=v_row.user_id;
   update public.network_contact_consents set consented=false,consented_at=null,updated_at=now() where user_id=v_row.user_id;
   update public.network_profiles set public_visible=false,updated_at=now() where user_id=v_row.user_id;
   update public.memberships set status='inactive',updated_at=now() where user_id=v_row.user_id and status='active';
   update public.profiles set display_name=null,mobile=null,is_active=(v_row.request_kind='reset'),updated_at=now() where id=v_row.user_id;

   if v_row.request_kind='delete' then
     update private.community_posts set status='withdrawn',updated_at=now() where user_id=v_row.user_id and status in ('pending','approved');
     update private.community_comments set hidden=true where user_id=v_row.user_id;
   end if;

   v_summary:=jsonb_build_object(
     'kind',v_row.request_kind,
     'points_zeroed',true,
     'level_reset',true,
     'footprints_cleared',true,
     'birthday_cleared',true,
     'contact_profile_cleared',true,
     'membership_history_retained',true,
     'membership_reapplication_required',true,
     'public_network_hidden',true,
     'account_active',v_row.request_kind='reset'
   );
 end if;

 update private.personal_data_requests set
   status='completed',review_note=trim(p_note),reviewed_by=v_actor,
   executed_by=v_actor,executed_at=now(),execution_summary=v_summary,
   updated_at=now(),completed_at=now()
 where id=p_request;

 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
 values(v_actor,'admin','personal_data_request_executed','personal_data_request',p_request::text,
   v_row.request_kind||' · execution completed; no raw personal data recorded in audit note');

 insert into public.user_notifications(recipient_user_id,kind,title,body,related_type,related_id)
 values(v_row.user_id,'workflow','個人資料申請已完成',
   case v_row.request_kind when 'reset' then '全部重置已完成；可重新填寫資料並提出會員申請。'
        when 'delete' then '帳號資料停用與可識別資料清理已完成；必要歷史與稽核紀錄依規則保留。'
        else '核准的個人資料修改已完成。' end,
   'personal_data_request',p_request);

 return v_summary;
end;$$;

revoke all on function public.personal_data_requests_self() from public,anon;
revoke all on function public.admin_personal_data_request_review(uuid,text,text,boolean) from public,anon;
revoke all on function public.admin_personal_data_request_execute(uuid,text) from public,anon;
grant execute on function public.personal_data_requests_self(),public.admin_personal_data_request_review(uuid,text,text,boolean),public.admin_personal_data_request_execute(uuid,text) to authenticated;
