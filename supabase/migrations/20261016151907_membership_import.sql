-- Imports confirm the current-year roster of already approved, active members.
-- They do not create accounts, activate memberships, change teams or award points.
create table private.membership_import_batches (
 id uuid primary key,actor_id uuid not null references public.profiles(id),membership_year integer not null,
 row_count integer not null check(row_count between 1 and 100),payload_hash text not null,
 confirmation_note text not null check(length(confirmation_note) between 1 and 1000),created_at timestamptz not null default now()
);
alter table private.membership_import_batches enable row level security;
revoke all on private.membership_import_batches from public,anon,authenticated;

create function private.membership_import_preview(p_rows jsonb,p_year integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_row jsonb;v_result jsonb:='[]';v_errors jsonb;v_index integer:=0;
 v_email text;v_name text;v_type text;v_date_text text;v_ref_email text;v_date date;v_since date;
 v_user uuid;v_ref uuid;v_count integer;v_m public.memberships%rowtype;v_existing uuid;v_previous private.membership_register%rowtype;v_state text;v_ready integer:=0;
begin
 if v_actor is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 if p_year is distinct from extract(year from now() at time zone 'Asia/Taipei')::integer then raise exception 'invalid_membership_period';end if;
 if p_rows is null or jsonb_typeof(p_rows)<>'array' then raise exception 'invalid_import_payload';end if;
 if jsonb_array_length(p_rows) not between 0 and 100 or octet_length(p_rows::text)>131072 then raise exception 'import_size_limit';end if;
 for v_row in select value from jsonb_array_elements(p_rows) loop
  v_index:=v_index+1;v_errors:='[]';v_user:=null;v_ref:=null;v_date:=null;v_since:=null;v_m:=null;v_existing:=null;v_previous:=null;v_state:='';
  if jsonb_typeof(v_row)<>'object' then raise exception 'invalid_import_payload';end if;
  if exists(select 1 from jsonb_each(v_row) e where e.key not in ('email','name','membership_type','member_since','referrer_email') or jsonb_typeof(e.value)<>'string') then raise exception 'invalid_import_payload';end if;
  v_email:=lower(trim(v_row->>'email'));v_name:=trim(v_row->>'name');v_type:=v_row->>'membership_type';v_date_text:=v_row->>'member_since';v_ref_email:=lower(trim(coalesce(v_row->>'referrer_email','')));
  if coalesce(length(v_email),0) not between 3 and 254 or v_email!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then v_errors:=v_errors||'"invalid_email"'::jsonb;end if;
  if coalesce(length(v_name),0) not between 1 and 100 then v_errors:=v_errors||'"invalid_name"'::jsonb;end if;
  if v_type is null or v_type not in ('annual','lifetime') then v_errors:=v_errors||'"invalid_type"'::jsonb;end if;
  begin
   if v_date_text is null or v_date_text!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'invalid_date';end if;
   v_date:=v_date_text::date;
   if v_date<'1900-01-01'::date or v_date>(now() at time zone 'Asia/Taipei')::date then raise exception 'invalid_date';end if;
  exception when others then v_date:=null;v_errors:=v_errors||'"invalid_date"'::jsonb;end;
  if (select count(*) from jsonb_array_elements(p_rows) a where lower(trim(a->>'email'))=v_email)>1 then v_errors:=v_errors||'"duplicate_email"'::jsonb;end if;
  select count(*),(array_agg(p.id))[1] into v_count,v_user from auth.users u join public.profiles p on p.id=u.id and p.is_active where lower(trim(u.email))=v_email and u.email_confirmed_at is not null;
  if v_count<>1 then v_errors:=v_errors||'"account_not_unique_or_verified"'::jsonb;v_user:=null;
  else
   select * into v_m from public.memberships where user_id=v_user;
   if v_m.id is null or v_m.status<>'active' or v_m.membership_type not in ('annual','lifetime') then v_errors:=v_errors||'"active_membership_required"'::jsonb;
   elsif v_m.membership_type::text<>v_type then v_errors:=v_errors||'"membership_type_mismatch"'::jsonb;end if;
   select coalesce(min(member_since),v_m.member_since) into v_since from private.membership_register where user_id=v_user;
   if v_since is not null and v_m.member_since is not null and v_since<>v_m.member_since then v_errors:=v_errors||'"existing_date_conflict"'::jsonb;end if;
   select * into v_previous from private.membership_register where user_id=v_user order by membership_year desc limit 1;
   if v_since is not null and v_date is distinct from v_since then v_errors:=v_errors||'"original_date_mismatch"'::jsonb;end if;
   select id into v_existing from private.membership_register where user_id=v_user and membership_year=p_year;
   if v_existing is not null then v_errors:=v_errors||'"year_already_confirmed"'::jsonb;end if;
   if exists(select 1 from private.membership_applications where user_id=v_user and status='pending') then v_errors:=v_errors||'"application_pending"'::jsonb;end if;
   v_state:=v_user::text||coalesce(v_m.updated_at::text,'')||coalesce(v_since::text,'')||coalesce(v_existing::text,'');
  end if;
  if length(v_ref_email)>0 then
   if length(v_ref_email)>254 or v_ref_email!~'^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then v_errors:=v_errors||'"invalid_referrer_email"'::jsonb;
   else
    select count(*),(array_agg(p.id))[1] into v_count,v_ref from auth.users u join public.profiles p on p.id=u.id and p.is_active join public.memberships m on m.user_id=p.id and m.status='active' and m.membership_type in ('annual','lifetime') where lower(trim(u.email))=v_ref_email and u.email_confirmed_at is not null;
    if v_count<>1 or v_ref=v_user then v_errors:=v_errors||'"invalid_referrer"'::jsonb;v_ref:=null;end if;
   end if;
  end if;
  if v_ref_email='' then v_ref:=v_previous.referrer_id;end if;
  if jsonb_array_length(v_errors)=0 then v_ready:=v_ready+1;end if;
  v_result:=v_result||jsonb_build_array(jsonb_build_object('row',v_index,'email',v_email,'name',v_name,'membership_type',v_type,'member_since',v_date_text,'referrer_email',v_ref_email,'user_id',v_user,'referrer_id',v_ref,'inherited_source',v_ref_email='' and v_previous.id is not null,'errors',v_errors,'state',md5(v_state||coalesce(v_ref::text,'')||coalesce(v_previous.referrer_text,'')||coalesce(v_previous.referrer_enterprise_id::text,''))));
 end loop;
 return jsonb_build_object('year',p_year,'rows',v_result,'ready',v_ready,'total',v_index,'fingerprint',md5(jsonb_build_object('actor',v_actor,'year',p_year,'input',p_rows,'state',v_result)::text));
end;$$;

create function private.membership_import_commit(p_rows jsonb,p_year integer,p_fingerprint text,p_batch uuid,p_note text,p_confirmed boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_preview jsonb;v_item jsonb;v_hash text;v_batch private.membership_import_batches%rowtype;v_count integer;
begin
 if v_actor is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 if p_confirmed is distinct from true or coalesce(length(trim(p_note)),0) not between 1 and 1000 or p_batch is null then raise exception 'import_confirmation_required';end if;
 v_hash:=md5(jsonb_build_object('actor',v_actor,'year',p_year,'rows',p_rows,'note',trim(p_note))::text);
 perform pg_advisory_xact_lock(hashtextextended(p_batch::text,0));
 select * into v_batch from private.membership_import_batches where id=p_batch;
 if found then
  if v_batch.actor_id<>v_actor or v_batch.payload_hash<>v_hash then raise exception 'import_batch_conflict';end if;
  return jsonb_build_object('count',v_batch.row_count,'already_completed',true);
 end if;
 -- Validate before acquiring row locks, then recheck the exact preview under locks.
 v_preview:=private.membership_import_preview(p_rows,p_year);
 if (v_preview->>'total')::integer=0 then raise exception 'import_size_limit';end if;
 if (v_preview->>'ready')::integer<>(v_preview->>'total')::integer then raise exception 'import_rows_need_correction';end if;
 perform u.id from auth.users u where u.id in (select (r->>'user_id')::uuid from jsonb_array_elements(v_preview->'rows') r union select (r->>'referrer_id')::uuid from jsonb_array_elements(v_preview->'rows') r) order by u.id for share;
 perform p.id from public.profiles p where p.id in (select (r->>'user_id')::uuid from jsonb_array_elements(v_preview->'rows') r union select (r->>'referrer_id')::uuid from jsonb_array_elements(v_preview->'rows') r) order by p.id for no key update;
 perform m.id from public.memberships m where m.user_id in (select (r->>'user_id')::uuid from jsonb_array_elements(v_preview->'rows') r union select (r->>'referrer_id')::uuid from jsonb_array_elements(v_preview->'rows') r) order by m.user_id for update;
 v_preview:=private.membership_import_preview(p_rows,p_year);
 if (v_preview->>'ready')::integer<>(v_preview->>'total')::integer or v_preview->>'fingerprint' is distinct from p_fingerprint then raise exception 'import_preview_changed';end if;
 for v_item in select value from jsonb_array_elements(v_preview->'rows') loop
  perform public.admin_membership_confirm_existing((v_item->>'user_id')::uuid,v_item->>'name',(v_item->>'member_since')::date,p_year,(v_item->>'referrer_id')::uuid,trim(p_note));
  if v_item->>'referrer_email'='' then
   update private.membership_register target set referrer_text=prior.referrer_text,referrer_enterprise_id=prior.referrer_enterprise_id
    from (select referrer_text,referrer_enterprise_id from private.membership_register where user_id=(v_item->>'user_id')::uuid and membership_year<p_year order by membership_year desc limit 1) prior
    where target.user_id=(v_item->>'user_id')::uuid and target.membership_year=p_year;
  end if;
 end loop;
 v_count:=(v_preview->>'total')::integer;
 insert into private.membership_import_batches(id,actor_id,membership_year,row_count,payload_hash,confirmation_note) values(p_batch,v_actor,p_year,v_count,v_hash,trim(p_note));
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(v_actor,'admin','membership_roster_imported','membership_import',p_batch::text,'核對並登錄當年度名冊，共 '||v_count||' 筆；原始資料與依據限會員管理員查閱');
 return jsonb_build_object('count',v_count,'already_completed',false);
end;$$;

revoke all on function private.membership_import_preview(jsonb,integer),private.membership_import_commit(jsonb,integer,text,uuid,text,boolean) from public,anon;
grant execute on function private.membership_import_preview(jsonb,integer),private.membership_import_commit(jsonb,integer,text,uuid,text,boolean) to authenticated;
create function public.admin_membership_import_preview(p_rows jsonb,p_year integer) returns jsonb language sql stable security invoker set search_path='' as $$select private.membership_import_preview(p_rows,p_year);$$;
create function public.admin_membership_import_commit(p_rows jsonb,p_year integer,p_fingerprint text,p_batch uuid,p_note text,p_confirmed boolean) returns jsonb language sql security invoker set search_path='' as $$select private.membership_import_commit(p_rows,p_year,p_fingerprint,p_batch,p_note,p_confirmed);$$;
revoke all on function public.admin_membership_import_preview(jsonb,integer),public.admin_membership_import_commit(jsonb,integer,text,uuid,text,boolean) from public,anon;
grant execute on function public.admin_membership_import_preview(jsonb,integer),public.admin_membership_import_commit(jsonb,integer,text,uuid,text,boolean) to authenticated;

-- Original admission dates are used by points expiry. Legacy membership edits
-- must not silently replace them with today's date, or downgrade lifetime status.
create function private.set_membership_guarded(p_user_id uuid,p_membership_type public.membership_type,p_member_since date,p_member_number text,p_status text,p_note text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_m public.memberships%rowtype;v_id uuid;v_original date;
begin
 if v_actor is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 if p_membership_type is null or p_membership_type not in ('annual','lifetime') or p_status is null or p_status not in ('active','inactive','pending') then raise exception 'invalid_membership_settings';end if;
 if p_member_since is null or p_member_since<'1900-01-01'::date or p_member_since>(now() at time zone 'Asia/Taipei')::date then raise exception 'invalid_membership_period';end if;
 if coalesce(length(trim(p_note)),0) not between 1 and 1000 or length(coalesce(p_member_number,''))>100 then raise exception 'confirmation_required';end if;
 perform 1 from public.profiles where id=p_user_id for no key update;
 if not found then raise exception 'profile_not_found';end if;
 select * into v_m from public.memberships where user_id=p_user_id for update;
 select coalesce(min(member_since),v_m.member_since) into v_original from private.membership_register where user_id=p_user_id;
 if v_original is not null and p_member_since<>v_original then raise exception 'original_member_since_required';end if;
 if p_membership_type<>'lifetime' and (v_m.membership_type='lifetime' or exists(select 1 from private.membership_register where user_id=p_user_id and membership_type='lifetime')) then raise exception 'cannot_downgrade_lifetime';end if;
 insert into public.memberships(user_id,membership_type,member_since,member_number,status) values(p_user_id,p_membership_type,p_member_since,nullif(trim(p_member_number),''),p_status)
 on conflict(user_id) do update set membership_type=excluded.membership_type,member_since=excluded.member_since,member_number=coalesce(excluded.member_number,public.memberships.member_number),status=excluded.status,updated_at=now() returning id into v_id;
 insert into public.user_notifications(recipient_user_id,kind,title,body,related_type,related_id) values(p_user_id,'membership','RCSCA 會員身份已更新','你的正式會員身份已由協會更新，可在「身份與使用權限」查看。','membership',v_id)
 on conflict(recipient_user_id,kind,related_type,related_id) where related_id is not null do update set title=excluded.title,body=excluded.body,read_at=null,created_at=now();
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(v_actor,'admin','membership_updated','membership',v_id::text,p_note);
 return v_id;
end;$$;
revoke all on function private.set_membership_guarded(uuid,public.membership_type,date,text,text,text) from public,anon;
grant execute on function private.set_membership_guarded(uuid,public.membership_type,date,text,text,text) to authenticated;
create or replace function public.admin_set_membership(p_user_id uuid,p_membership_type public.membership_type,p_member_since date default current_date,p_member_number text default null,p_status text default 'active',p_note text default null)
returns uuid language sql security invoker set search_path='' as $$select private.set_membership_guarded(p_user_id,p_membership_type,p_member_since,p_member_number,p_status,p_note);$$;
revoke all on function public.admin_set_membership(uuid,public.membership_type,date,text,text,text) from public,anon;
grant execute on function public.admin_set_membership(uuid,public.membership_type,date,text,text,text) to authenticated;
