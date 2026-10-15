-- A reviewed request is distinct from execution. No submission or approval here
-- deletes data or resets balances; completion records separately verified work.
create table private.personal_data_requests (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id),
 request_kind text not null check(request_kind in ('edit','reset','delete')),
 requested_changes jsonb not null default '{}'::jsonb,
 reason text not null check(length(trim(reason)) between 1 and 1000),
 reset_scope text check(reset_scope is null or reset_scope='profile_points_xp_level_footprints'),
 confirmation_one boolean not null default false,
 confirmation_two boolean not null default false,
 status text not null default 'submitted' check(status in ('submitted','needs_info','approved','processing','completed','rejected','cancelled')),
 review_note text,reviewed_by uuid references public.profiles(id),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),completed_at timestamptz,
 check(request_kind='edit' or (confirmation_one and confirmation_two)),
 check((request_kind='reset')=(reset_scope is not null))
);
alter table private.personal_data_requests enable row level security;
revoke all on private.personal_data_requests from public,anon,authenticated;
create unique index personal_data_one_open_request on private.personal_data_requests(user_id) where status in ('submitted','needs_info','approved','processing');

create function public.personal_data_requests_self()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'authentication_required';end if;
 return coalesce((select jsonb_agg(to_jsonb(r)-'reviewed_by' order by r.created_at desc) from private.personal_data_requests r where r.user_id=auth.uid()),'[]'::jsonb);
end;$$;

create function public.personal_data_request_submit(p_kind text,p_changes jsonb,p_reason text,p_confirm_one boolean,p_confirm_two boolean,p_request uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_id uuid;v_row private.personal_data_requests%rowtype;v_key text;v_value text;
begin
 if v_actor is null then raise exception 'authentication_required';end if;
 if p_kind is null or p_kind not in ('edit','reset','delete') or coalesce(length(trim(p_reason)),0) not between 1 and 1000 then raise exception 'invalid_data_request';end if;
 if p_kind in ('reset','delete') and (p_confirm_one is distinct from true or p_confirm_two is distinct from true) then raise exception 'two_confirmations_required';end if;
 if p_changes is null or jsonb_typeof(p_changes)<>'object' then raise exception 'invalid_requested_changes';end if;
 if p_kind='edit' then
   for v_key,v_value in select key,value from jsonb_each_text(p_changes) loop
     if v_key not in ('display_name','mobile','contact_email','address') or jsonb_typeof(p_changes->v_key)<>'string' or length(trim(v_value))=0 or length(v_value)>(case when v_key='address' then 500 when v_key='contact_email' then 254 when v_key='mobile' then 30 else 100 end) then raise exception 'invalid_requested_changes';end if;
   end loop;
 elsif p_changes<>'{}'::jsonb then raise exception 'invalid_requested_changes';end if;
 perform 1 from public.profiles where id=v_actor for no key update;
 if not found then raise exception 'profile_required';end if;
 if p_request is not null then
   select * into v_row from private.personal_data_requests where id=p_request and user_id=v_actor for update;
   if not found or v_row.status<>'needs_info' then raise exception 'request_not_editable';end if;
   update private.personal_data_requests set request_kind=p_kind,requested_changes=p_changes,reason=trim(p_reason),
    reset_scope=case when p_kind='reset' then 'profile_points_xp_level_footprints' end,confirmation_one=coalesce(p_confirm_one,false),confirmation_two=coalesce(p_confirm_two,false),status='submitted',review_note=null,reviewed_by=null,updated_at=now() where id=p_request;
   v_id:=p_request;
 else
   if exists(select 1 from private.personal_data_requests where user_id=v_actor and status in ('submitted','needs_info','approved','processing')) then raise exception 'existing_data_request_pending';end if;
   insert into private.personal_data_requests(user_id,request_kind,requested_changes,reason,reset_scope,confirmation_one,confirmation_two)
    values(v_actor,p_kind,p_changes,trim(p_reason),case when p_kind='reset' then 'profile_points_xp_level_footprints' end,coalesce(p_confirm_one,false),coalesce(p_confirm_two,false)) returning id into v_id;
 end if;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(v_actor,'user','personal_data_request_submitted','personal_data_request',v_id::text,p_kind);
 return v_id;
end;$$;

create function public.personal_data_request_cancel(p_request uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'authentication_required';end if;
 update private.personal_data_requests set status='cancelled',updated_at=now() where id=p_request and user_id=auth.uid() and status in ('submitted','needs_info');
 if not found then raise exception 'request_not_cancellable';end if;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(auth.uid(),'user','personal_data_request_cancelled','personal_data_request',p_request::text,'會員撤回尚未核准的資料申請');
end;$$;

create function public.admin_personal_data_requests()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 return coalesce((select jsonb_agg(to_jsonb(r)||jsonb_build_object('display_name',p.display_name) order by r.created_at desc) from private.personal_data_requests r join public.profiles p on p.id=r.user_id),'[]'::jsonb);
end;$$;

create function public.admin_personal_data_request_review(p_request uuid,p_decision text,p_note text,p_execution_confirmed boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_row private.personal_data_requests%rowtype;
begin
 if v_actor is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 if coalesce(length(trim(p_note)),0) not between 1 and 1000 then raise exception 'review_note_required';end if;
 select * into v_row from private.personal_data_requests where id=p_request for update;
 if not found then raise exception 'request_not_found';end if;
 if v_row.user_id=v_actor then raise exception 'cannot_review_own_request';end if;
 if p_decision is null or not (
   (v_row.status='submitted' and p_decision in ('needs_info','approved','rejected')) or
   (v_row.status='needs_info' and p_decision='rejected') or
   (v_row.status='approved' and p_decision in ('processing','rejected')) or
   (v_row.status='processing' and p_decision='completed')) then raise exception 'invalid_status_transition';end if;
 if p_decision='completed' and p_execution_confirmed is distinct from true then raise exception 'execution_confirmation_required';end if;
 update private.personal_data_requests set status=p_decision,review_note=trim(p_note),reviewed_by=v_actor,updated_at=now(),completed_at=case when p_decision='completed' then now() end where id=p_request;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(v_actor,'admin','personal_data_request_'||p_decision,'personal_data_request',p_request::text,trim(p_note));
end;$$;

revoke all on function public.personal_data_requests_self() from public,anon;
revoke all on function public.personal_data_request_submit(text,jsonb,text,boolean,boolean,uuid) from public,anon;
revoke all on function public.personal_data_request_cancel(uuid) from public,anon;
revoke all on function public.admin_personal_data_requests() from public,anon;
revoke all on function public.admin_personal_data_request_review(uuid,text,text,boolean) from public,anon;
grant execute on function public.personal_data_requests_self(),public.personal_data_request_submit(text,jsonb,text,boolean,boolean,uuid),public.personal_data_request_cancel(uuid),public.admin_personal_data_requests(),public.admin_personal_data_request_review(uuid,text,text,boolean) to authenticated;
