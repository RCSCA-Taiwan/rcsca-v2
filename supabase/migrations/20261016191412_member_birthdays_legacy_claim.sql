-- Private birthday data and pre-account history. No public profile/contact expansion.
create table private.member_birthdays (
 user_id uuid primary key references public.profiles(id),birth_date date not null,
 greetings_consent boolean not null default false,updated_at timestamptz not null default now()
);
create table private.legacy_member_batches (
 id uuid primary key,actor_id uuid not null references public.profiles(id),payload_hash text not null,
 row_count integer not null,source_note text not null,created_at timestamptz not null default now()
);
create table private.legacy_members (
 id uuid primary key default gen_random_uuid(),batch_id uuid not null references private.legacy_member_batches(id),
 full_name text not null,email text,phone text,identity_secret_id uuid references vault.secrets(id),
 membership_type public.membership_type not null check(membership_type in ('annual','lifetime')),
 member_since date not null,membership_year integer not null,birth_date date,referrer_text text,
 claimed_by uuid unique references public.profiles(id),claimed_at timestamptz
);
create index legacy_members_email on private.legacy_members(email);
create table private.legacy_member_claims (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),
 full_name text not null,phone text,identity_secret_id uuid references vault.secrets(id),
 candidate_id uuid references private.legacy_members(id),status text not null default 'pending' check(status in ('pending','approved','rejected')),
 reviewed_by uuid references public.profiles(id),review_note text,created_at timestamptz not null default now(),reviewed_at timestamptz
);
create unique index legacy_claim_one_pending on private.legacy_member_claims(user_id) where status='pending';
alter table private.member_birthdays enable row level security;
alter table private.legacy_member_batches enable row level security;
alter table private.legacy_members enable row level security;
alter table private.legacy_member_claims enable row level security;
revoke all on private.member_birthdays,private.legacy_member_batches,private.legacy_members,private.legacy_member_claims from public,anon,authenticated;

create function private.member_identity_valid(p_value text)
returns boolean language plpgsql immutable set search_path='' as $$
declare v text:=upper(trim(p_value));c integer;s integer;i integer;
begin
 if v is null or v!~'^[A-Z][12][0-9]{8}$' then return false;end if;
 c:=strpos('ABCDEFGHJKLMNPQRSTUVXYWZIO',left(v,1))+9;s:=c/10+(c%10)*9+right(v,1)::integer;
 for i in 2..9 loop s:=s+substr(v,i,1)::integer*(10-i);end loop;return s%10=0;
end;$$;
revoke all on function private.member_identity_valid(text) from public,anon,authenticated;

create function private.member_birthday_save(p_birth_date date,p_greetings boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and is_active) then raise exception 'authentication_required';end if;
 if p_birth_date is not null and (p_birth_date<'1900-01-01'::date or p_birth_date>(now() at time zone 'Asia/Taipei')::date) then raise exception 'invalid_birthday';end if;
 if p_birth_date is null then
  if p_greetings is true then raise exception 'invalid_birthday';end if;
  delete from private.member_birthdays where user_id=auth.uid();
 else
  insert into private.member_birthdays(user_id,birth_date,greetings_consent) values(auth.uid(),p_birth_date,coalesce(p_greetings,false))
   on conflict(user_id) do update set birth_date=excluded.birth_date,greetings_consent=excluded.greetings_consent,updated_at=now();
 end if;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
 values(auth.uid(),'user','member_birthday_updated','profile',auth.uid()::text,'本人更新生日及生日祝賀意願；生日不列入紀錄');
end;$$;
create function public.member_birthday_save(p_birth_date date,p_greetings boolean)
returns void language sql security invoker set search_path='' as $$ select private.member_birthday_save(p_birth_date,p_greetings); $$;

create function private.member_history_self()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'authentication_required';end if;
 select jsonb_build_object('birth_date',b.birth_date,'greetings_consent',coalesce(b.greetings_consent,false),
 'membership_type',m.membership_type,'membership_status',m.status,'member_since',m.member_since,
 'years',case when m.member_since is not null then extract(year from age((now() at time zone 'Asia/Taipei')::date,m.member_since))::integer end,
 'claim', (select jsonb_build_object('status',c.status,'review_note',c.review_note) from private.legacy_member_claims c where c.user_id=p.id order by c.created_at desc limit 1)) into result
 from public.profiles p left join private.member_birthdays b on b.user_id=p.id left join public.memberships m on m.user_id=p.id where p.id=auth.uid() and p.is_active;
 if result is null then raise exception 'authentication_required';end if;return result;
end;$$;
create function public.member_history_self() returns jsonb language sql stable security invoker set search_path='' as $$select private.member_history_self();$$;

create function private.admin_member_birthdays(p_month integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 if p_month is null or p_month not between 1 and 12 then raise exception 'invalid_month';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('name',coalesce((select full_name from private.membership_register where user_id=p.id order by membership_year desc limit 1),p.display_name),'month',extract(month from b.birth_date),'day',extract(day from b.birth_date),'membership_type',m.membership_type) order by extract(day from b.birth_date),p.display_name)
 from private.member_birthdays b join public.profiles p on p.id=b.user_id and p.is_active join public.memberships m on m.user_id=p.id and m.status='active'
 where m.membership_type in ('annual','lifetime') and b.greetings_consent and extract(month from b.birth_date)=p_month),'[]'::jsonb);
end;$$;
create function public.admin_member_birthdays(p_month integer) returns jsonb language sql stable security invoker set search_path='' as $$select private.admin_member_birthdays(p_month);$$;

-- p_commit=false never writes. Commit requires a digest of this exact actor/input/state preview.
create function private.legacy_members_import(p_rows jsonb,p_batch uuid,p_note text,p_commit boolean,p_fingerprint text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb;e jsonb;out_rows jsonb:='[]';i integer:=0;ready integer:=0;v_email text;v_phone text;v_id text;v_date date;v_birth date;v_year integer;
 h text;fp text;old private.legacy_member_batches%rowtype;secret uuid;dupe boolean;today date:=(now() at time zone 'Asia/Taipei')::date;
begin
 if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 if p_rows is null or jsonb_typeof(p_rows)<>'array' then raise exception 'invalid_import_payload';end if;
 if jsonb_array_length(p_rows) not between 1 and 100 or octet_length(p_rows::text)>131072 then raise exception 'import_size_limit';end if;
 h:=md5(jsonb_build_object('actor',auth.uid(),'rows',p_rows,'note',trim(p_note))::text);
 -- Serialize all import previews/commits to protect overlapping contacts and retry batches.
 perform pg_advisory_xact_lock(hashtextextended('legacy_members_import',0));
 if p_commit is true then
  if p_batch is null or coalesce(length(trim(p_note)),0) not between 1 and 1000 then raise exception 'import_confirmation_required';end if;
  select * into old from private.legacy_member_batches where id=p_batch;
  if found then
   if old.actor_id<>auth.uid() or old.payload_hash<>h then raise exception 'import_batch_conflict';end if;
   return jsonb_build_object('count',old.row_count,'already_completed',true);
  end if;
 end if;
 for r in select value from jsonb_array_elements(p_rows) loop
  i:=i+1;e:='[]';v_date:=null;v_birth:=null;v_year:=null;dupe:=false;
  if jsonb_typeof(r)<>'object' or exists(select 1 from jsonb_each(r) f where f.key not in ('name','email','phone','identity','membership_type','member_since','membership_year','birth_date','referrer_text') or jsonb_typeof(f.value)<>'string') then raise exception 'invalid_import_payload';end if;
  v_email:=lower(trim(coalesce(r->>'email','')));v_phone:=regexp_replace(coalesce(r->>'phone',''),'[ ()+-]','','g');v_id:=upper(trim(coalesce(r->>'identity','')));
  if coalesce(length(trim(r->>'name')),0) not between 1 and 100 then e:=e||'"invalid_name"'::jsonb;end if;
  if r->>'membership_type' is null or r->>'membership_type' not in ('annual','lifetime') then e:=e||'"invalid_type"'::jsonb;end if;
  if v_email<>'' and (length(v_email)>254 or v_email!~'^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$') then e:=e||'"invalid_email"'::jsonb;end if;
  if v_phone<>'' and v_phone!~'^[0-9]{6,20}$' then e:=e||'"invalid_phone"'::jsonb;end if;
  if v_id<>'' and not private.member_identity_valid(v_id) then e:=e||'"invalid_identity"'::jsonb;end if;
  if v_email='' and v_phone='' and v_id='' then e:=e||'"contact_required"'::jsonb;end if;
  if length(coalesce(r->>'referrer_text',''))>200 then e:=e||'"invalid_source_text"'::jsonb;end if;
  begin
   if coalesce(r->>'member_since','')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'invalid';end if;
   v_date:=(r->>'member_since')::date;if v_date<'1900-01-01'::date or v_date>today then raise exception 'invalid';end if;
  exception when others then e:=e||'"invalid_date"'::jsonb;end;
  begin
   if coalesce(r->>'membership_year','')!~'^[0-9]{4}$' then raise exception 'invalid';end if;
   v_year:=(r->>'membership_year')::integer;if v_year<1900 or v_year>extract(year from today) or v_year<extract(year from v_date) then raise exception 'invalid';end if;
  exception when others then e:=e||'"invalid_year"'::jsonb;end;
  begin
   if coalesce(r->>'birth_date','')<>'' then
    if r->>'birth_date'!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'invalid';end if;
    v_birth:=(r->>'birth_date')::date;if v_birth<'1900-01-01'::date or v_birth>today or v_birth>v_date then raise exception 'invalid';end if;
   end if;
  exception when others then e:=e||'"invalid_birthday"'::jsonb;end;
  -- Shared family phone/email does not prove a duplicate person. Same name/contact does.
  select exists(select 1 from jsonb_array_elements(p_rows) a where trim(a->>'name')=trim(r->>'name') and
   ((v_email<>'' and lower(trim(a->>'email'))=v_email) or (v_id<>'' and upper(trim(a->>'identity'))=v_id) or (v_phone<>'' and regexp_replace(a->>'phone','[ ()+-]','','g')=v_phone))
   group by trim(a->>'name') having count(*)>1) into dupe;
  if (v_id<>'' and (select count(*) from jsonb_array_elements(p_rows) a where upper(trim(a->>'identity'))=v_id)>1) or dupe or exists(select 1 from private.legacy_members l left join vault.decrypted_secrets s on s.id=l.identity_secret_id where
    (v_id<>'' and s.decrypted_secret=v_id) or (l.full_name=trim(r->>'name') and ((v_email<>'' and l.email=v_email) or (v_phone<>'' and l.phone=v_phone)))) then e:=e||'"duplicate_record"'::jsonb;end if;
  if jsonb_array_length(e)=0 then ready:=ready+1;end if;
  out_rows:=out_rows||jsonb_build_array(jsonb_build_object('row',i,'name',trim(r->>'name'),'membership_type',r->>'membership_type','member_since',r->>'member_since','errors',e));
 end loop;
 fp:=md5(jsonb_build_object('actor',auth.uid(),'rows',p_rows,'validation',out_rows,'existing',coalesce((select jsonb_agg(jsonb_build_array(id,claimed_by) order by id) from private.legacy_members),'[]'::jsonb))::text);
 if p_commit is not true then return jsonb_build_object('rows',out_rows,'ready',ready,'total',i,'fingerprint',fp);end if;
 if ready<>i then raise exception 'import_rows_need_correction';end if;
 if p_fingerprint is distinct from fp then raise exception 'import_preview_changed';end if;
 insert into private.legacy_member_batches values(p_batch,auth.uid(),h,i,trim(p_note),now());
 for r in select value from jsonb_array_elements(p_rows) loop
  secret:=null;if nullif(trim(r->>'identity'),'') is not null then select vault.create_secret(upper(trim(r->>'identity'))) into secret;end if;
  insert into private.legacy_members(batch_id,full_name,email,phone,identity_secret_id,membership_type,member_since,membership_year,birth_date,referrer_text)
  values(p_batch,trim(r->>'name'),nullif(lower(trim(r->>'email')),''),nullif(regexp_replace(r->>'phone','[ ()+-]','','g'),''),secret,(r->>'membership_type')::public.membership_type,(r->>'member_since')::date,(r->>'membership_year')::integer,nullif(r->>'birth_date','')::date,nullif(trim(r->>'referrer_text'),''));
 end loop;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(auth.uid(),'admin','legacy_members_imported','legacy_batch',p_batch::text,'匯入未認領會籍名冊；不建立帳號或啟用會籍');
 return jsonb_build_object('count',i,'already_completed',false);
end;$$;
create function public.admin_legacy_members_import(p_rows jsonb,p_batch uuid,p_note text,p_commit boolean,p_fingerprint text)
returns jsonb language sql security invoker set search_path='' as $$select private.legacy_members_import(p_rows,p_batch,p_note,p_commit,p_fingerprint);$$;

create function private.legacy_member_preview(p_name text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_account_email text;matches integer;r private.legacy_members%rowtype;
begin
 select lower(trim(u.email)) into v_account_email from auth.users u join public.profiles p on p.id=u.id and p.is_active where u.id=auth.uid() and u.email_confirmed_at is not null;
 if v_account_email is null then raise exception 'verified_account_required';end if;
 select count(*) into matches from private.legacy_members l where l.email=v_account_email and l.full_name=trim(p_name) and l.claimed_by is null;
 if matches<>1 then return jsonb_build_object('status','manual');end if;
 select * into r from private.legacy_members l where l.email=v_account_email and l.full_name=trim(p_name) and l.claimed_by is null;
 return jsonb_build_object('status','matched','membership_type',r.membership_type,'member_since',r.member_since,'membership_year',r.membership_year);
end;$$;
create function public.legacy_member_preview(p_name text) returns jsonb language sql stable security invoker set search_path='' as $$select private.legacy_member_preview(p_name);$$;

create function private.legacy_member_claim(p_name text,p_phone text,p_identity text,p_consent boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();c uuid;candidate uuid;secret uuid;v_preview jsonb;v_phone text:=regexp_replace(coalesce(p_phone,''),'[ ()+-]','','g');
begin
 v_preview:=private.legacy_member_preview(p_name);
 if p_consent is distinct from true then raise exception 'consent_required';end if;
 if coalesce(length(trim(p_name)),0) not between 1 and 100 then raise exception 'invalid_contact';end if;
 if v_phone<>'' and v_phone!~'^[0-9]{6,20}$' then raise exception 'invalid_contact';end if;
 if nullif(trim(p_identity),'') is not null and not private.member_identity_valid(p_identity) then raise exception 'invalid_identity';end if;
 perform 1 from public.profiles where id=actor for no key update;
 select id into c from private.legacy_member_claims where user_id=actor and status='pending';if found then return c;end if;
 if exists(select 1 from private.legacy_members where claimed_by=actor) then raise exception 'legacy_already_claimed';end if;
 if v_preview->>'status'='matched' then
  select l.id into candidate from private.legacy_members l join auth.users u on lower(trim(u.email))=l.email where u.id=actor and l.full_name=trim(p_name) and l.claimed_by is null;
 elsif v_phone='' and nullif(trim(p_identity),'') is null then raise exception 'claim_contact_required';end if;
 if nullif(trim(p_identity),'') is not null then select vault.create_secret(upper(trim(p_identity))) into secret;end if;
 insert into private.legacy_member_claims(user_id,full_name,phone,identity_secret_id,candidate_id) values(actor,trim(p_name),nullif(v_phone,''),secret,candidate) returning id into c;
 return c;
end;$$;
create function public.legacy_member_claim(p_name text,p_phone text,p_identity text,p_consent boolean) returns uuid language sql security invoker set search_path='' as $$select private.legacy_member_claim(p_name,p_phone,p_identity,p_consent);$$;

create function private.admin_legacy_member_claims()
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'user_id',c.user_id,'name',c.full_name,'email',u.email,'phone',c.phone,'status',c.status,'review_note',c.review_note,
 'candidates',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'name',l.full_name,'phone',l.phone,'email',l.email,'membership_type',l.membership_type,'member_since',l.member_since,'membership_year',l.membership_year,'referrer_text',l.referrer_text))
 from private.legacy_members l left join vault.decrypted_secrets ls on ls.id=l.identity_secret_id left join vault.decrypted_secrets cs on cs.id=c.identity_secret_id
 where l.claimed_by is null and l.full_name=c.full_name and (l.id=c.candidate_id or (c.phone is not null and l.phone=c.phone) or (cs.decrypted_secret is not null and ls.decrypted_secret=cs.decrypted_secret))),'[]'::jsonb)) order by c.created_at)
 from private.legacy_member_claims c join auth.users u on u.id=c.user_id where c.status='pending'),'[]'::jsonb);
end;$$;
create function public.admin_legacy_member_claims() returns jsonb language sql stable security invoker set search_path='' as $$select private.admin_legacy_member_claims();$$;

create function private.admin_legacy_member_review(p_claim uuid,p_record uuid,p_approve boolean,p_note text,p_confirmed boolean)
returns void language plpgsql security definer set search_path='' as $$
declare c private.legacy_member_claims%rowtype;r private.legacy_members%rowtype;m public.memberships%rowtype;original date;year integer:=extract(year from now() at time zone 'Asia/Taipei');
begin
 if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 if coalesce(length(trim(p_note)),0) not between 1 and 1000 or p_approve is null then raise exception 'review_note_required';end if;
 -- Same lock ordering as ordinary membership review: profile, then claim/record/membership.
 select * into c from private.legacy_member_claims where id=p_claim;
 if c.id is null or c.user_id=auth.uid() then raise exception 'cannot_review_own_application';end if;
 perform 1 from public.profiles where id=c.user_id and is_active for no key update;if not found then raise exception 'authentication_required';end if;
 select * into c from private.legacy_member_claims where id=p_claim for update;
 if c.status<>'pending' then raise exception 'application_not_pending';end if;
 if p_approve then
  if p_confirmed is distinct from true then raise exception 'eligibility_confirmation_required';end if;
  if not exists(select 1 from auth.users where id=c.user_id and email_confirmed_at is not null) then raise exception 'verified_account_required';end if;
  select * into r from private.legacy_members where id=p_record for update;
  if r.id is null or r.claimed_by is not null or r.full_name<>c.full_name then raise exception 'legacy_record_unavailable';end if;
  if exists(select 1 from private.legacy_members where claimed_by=c.user_id) then raise exception 'legacy_already_claimed';end if;
  if exists(select 1 from private.membership_applications where user_id=c.user_id and status='pending') then raise exception 'application_pending';end if;
  -- A reviewer can only choose a candidate matching the originally submitted evidence.
  if r.id is distinct from c.candidate_id and not (coalesce(r.phone=c.phone,false) or exists(select 1 from vault.decrypted_secrets a join vault.decrypted_secrets b on a.decrypted_secret=b.decrypted_secret where a.id=r.identity_secret_id and b.id=c.identity_secret_id)) then raise exception 'legacy_record_unavailable';end if;
  select * into m from public.memberships where user_id=c.user_id for update;
  select coalesce(min(member_since),m.member_since) into original from private.membership_register where user_id=c.user_id;
  if (original is not null and original<>r.member_since) or (m.member_since is not null and m.member_since<>r.member_since) then raise exception 'original_member_since_required';end if;
  if m.membership_type='lifetime' and r.membership_type<>'lifetime' then raise exception 'cannot_downgrade_lifetime';end if;
  if exists(select 1 from private.membership_register where user_id=c.user_id and membership_year=r.membership_year) then raise exception 'membership_year_already_confirmed';end if;
  insert into public.memberships(user_id,membership_type,member_since,status) values(c.user_id,r.membership_type,r.member_since,case when r.membership_type='lifetime' or r.membership_year=year then 'active' else 'inactive' end)
  on conflict(user_id) do update set membership_type=excluded.membership_type,member_since=excluded.member_since,status=case when public.memberships.status='active' then public.memberships.status else excluded.status end,updated_at=now();
  insert into private.membership_register(user_id,membership_year,membership_type,full_name,member_since,confirmed_by,confirmation_note,referrer_text)
  values(c.user_id,r.membership_year,r.membership_type,r.full_name,r.member_since,auth.uid(),trim(p_note),r.referrer_text);
  if r.birth_date is not null then insert into private.member_birthdays(user_id,birth_date,greetings_consent) values(c.user_id,r.birth_date,false) on conflict(user_id) do nothing;end if;
  update private.legacy_members set claimed_by=c.user_id,claimed_at=now() where id=r.id;
 end if;
 update private.legacy_member_claims set status=case when p_approve then 'approved' else 'rejected' end,review_note=trim(p_note),reviewed_by=auth.uid(),reviewed_at=now() where id=c.id;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(auth.uid(),'admin','legacy_member_reviewed','legacy_claim',c.id::text,'已核對歷年會籍認領；不自動加入小隊或發放積分');
end;$$;
create function public.admin_legacy_member_review(p_claim uuid,p_record uuid,p_approve boolean,p_note text,p_confirmed boolean) returns void language sql security invoker set search_path='' as $$select private.admin_legacy_member_review(p_claim,p_record,p_approve,p_note,p_confirmed);$$;

revoke all on function private.member_birthday_save(date,boolean) from public,anon;
grant execute on function private.member_birthday_save(date,boolean) to authenticated;
revoke all on function public.member_birthday_save(date,boolean) from public,anon;
grant execute on function public.member_birthday_save(date,boolean) to authenticated;

revoke all on function private.member_history_self() from public,anon;
grant execute on function private.member_history_self() to authenticated;
revoke all on function public.member_history_self() from public,anon;
grant execute on function public.member_history_self() to authenticated;

revoke all on function private.admin_member_birthdays(integer) from public,anon;
grant execute on function private.admin_member_birthdays(integer) to authenticated;
revoke all on function public.admin_member_birthdays(integer) from public,anon;
grant execute on function public.admin_member_birthdays(integer) to authenticated;

revoke all on function private.legacy_members_import(jsonb,uuid,text,boolean,text) from public,anon;
grant execute on function private.legacy_members_import(jsonb,uuid,text,boolean,text) to authenticated;
revoke all on function public.admin_legacy_members_import(jsonb,uuid,text,boolean,text) from public,anon;
grant execute on function public.admin_legacy_members_import(jsonb,uuid,text,boolean,text) to authenticated;

revoke all on function private.legacy_member_preview(text) from public,anon;
grant execute on function private.legacy_member_preview(text) to authenticated;
revoke all on function public.legacy_member_preview(text) from public,anon;
grant execute on function public.legacy_member_preview(text) to authenticated;

revoke all on function private.legacy_member_claim(text,text,text,boolean) from public,anon;
grant execute on function private.legacy_member_claim(text,text,text,boolean) to authenticated;
revoke all on function public.legacy_member_claim(text,text,text,boolean) from public,anon;
grant execute on function public.legacy_member_claim(text,text,text,boolean) to authenticated;

revoke all on function private.admin_legacy_member_claims() from public,anon;
grant execute on function private.admin_legacy_member_claims() to authenticated;
revoke all on function public.admin_legacy_member_claims() from public,anon;
grant execute on function public.admin_legacy_member_claims() to authenticated;

revoke all on function private.admin_legacy_member_review(uuid,uuid,boolean,text,boolean) from public,anon;
grant execute on function private.admin_legacy_member_review(uuid,uuid,boolean,text,boolean) to authenticated;
revoke all on function public.admin_legacy_member_review(uuid,uuid,boolean,text,boolean) from public,anon;
grant execute on function public.admin_legacy_member_review(uuid,uuid,boolean,text,boolean) to authenticated;

-- Validate and save birthday in the same transaction as application submission.
create function public.membership_submit_with_birthday(p_kind text,p_type public.membership_type,p_name text,p_identity text,p_phone text,p_email text,p_address text,p_source_text text,p_join_team boolean,p_consent boolean,p_birth_date date,p_greetings boolean)
returns uuid language plpgsql security invoker set search_path='' as $$
declare result uuid;
begin
 if p_birth_date is null then raise exception 'invalid_birthday';end if;
 perform private.member_birthday_save(p_birth_date,p_greetings);
 result:=public.membership_submit_with_source(p_kind,p_type,p_name,p_identity,p_phone,p_email,p_address,p_source_text,p_join_team,p_consent);
 return result;
end;$$;
revoke all on function public.membership_submit_with_birthday(text,public.membership_type,text,text,text,text,text,text,boolean,boolean,date,boolean) from public,anon;
grant execute on function public.membership_submit_with_birthday(text,public.membership_type,text,text,text,text,text,text,boolean,boolean,date,boolean) to authenticated;
