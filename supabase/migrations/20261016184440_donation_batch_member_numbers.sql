create table private.donation_pledge_drafts(id uuid primary key,activity text not null,payload jsonb not null,created_by uuid not null references public.profiles(id),status text not null default 'draft' check(status in ('draft','imported')),updated_at timestamptz not null default now());
create table private.donation_name_links(activity text not null,label text not null,user_id uuid not null references public.profiles(id),confirmed_by uuid not null references public.profiles(id),primary key(activity,label,user_id));
alter table private.donation_pledge_drafts enable row level security;
alter table private.donation_name_links enable row level security;
revoke all on private.donation_pledge_drafts,private.donation_name_links from public,anon,authenticated;
create index donation_pledge_creator_idx on private.donation_pledge_drafts(created_by);
create index donation_link_user_idx on private.donation_name_links(user_id);
create index donation_link_confirmer_idx on private.donation_name_links(confirmed_by);
create function public.admin_donation_pledge_save(p_id uuid,p_activity text,p_payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 if p_id is null or coalesce(length(trim(p_activity)),0) not between 1 and 120 or jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>500000 or coalesce(length(p_payload->>'paste'),0)=0 then raise exception 'invalid_pledge_draft';end if;
 insert into private.donation_pledge_drafts(id,activity,payload,created_by) values(p_id,trim(p_activity),p_payload,auth.uid()) on conflict(id) do update set activity=excluded.activity,payload=excluded.payload,updated_at=now() where donation_pledge_drafts.created_by=auth.uid() and donation_pledge_drafts.status='draft';
 if not found then raise exception 'draft_not_editable';end if;
 return p_id;
end;$$;
create function public.admin_donation_pledge_list() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 return coalesce((select jsonb_agg(to_jsonb(d)) from (select id,activity,payload,updated_at from private.donation_pledge_drafts where created_by=auth.uid() and status='draft' order by updated_at desc limit 30) d),'[]'::jsonb);
end;$$;
revoke all on function public.admin_donation_pledge_save(uuid,text,jsonb),public.admin_donation_pledge_list() from public,anon;
grant execute on function public.admin_donation_pledge_save(uuid,text,jsonb),public.admin_donation_pledge_list() to authenticated;
create table private.donation_import_batches(id uuid primary key,activity text not null,digest text not null,rows jsonb not null,created_by uuid not null references public.profiles(id),created_at timestamptz not null default now(),record_count integer not null,total_received bigint not null);
alter table private.donation_import_batches enable row level security;
revoke all on private.donation_import_batches from public,anon,authenticated;
create index donation_import_creator_idx on private.donation_import_batches(created_by);
alter table private.donation_records add column activity_name text,add column pledged_amount integer check(pledged_amount>=0),add column import_batch uuid references private.donation_import_batches(id);
create index donation_records_batch_idx on private.donation_records(import_batch);

create function public.admin_donation_import_preview(p_activity text,p_rows jsonb) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_row jsonb;v_rows jsonb:='[]';v_issue text;v_user uuid;v_email_user uuid;v_count integer;v_index integer:=0;v_amount integer;v_pledged integer;v_date date;v_reference text;v_ready integer:=0;v_total bigint:=0;
begin
 if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 if coalesce(length(trim(p_activity)),0) not between 1 and 120 or jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) not between 1 and 500 then raise exception 'invalid_import_batch';end if;
 for v_row in select value from jsonb_array_elements(p_rows) loop
 v_index:=v_index+1;v_issue:=null;v_user:=null;v_email_user:=null;v_amount:=null;v_pledged:=null;v_date:=null;v_reference:=upper(trim(v_row->>'reference'));
 begin
 if coalesce(length(v_row->>'member_number'),0)>100 or coalesce(length(v_row->>'email'),0)>254 or coalesce(length(v_row->>'name'),0)>100 or coalesce(length(trim(v_row->>'note')),0) not between 1 and 1000 or coalesce(length(v_reference),0) not between 1 and 120 then raise exception '資料長度或核實依據不符';end if;
 if coalesce(v_row->>'amount','')!~'^[0-9]{1,10}$' or coalesce(v_row->>'pledged','')!~'^[0-9]{1,10}$' then raise exception '金額須填整數';end if;
 v_amount:=(v_row->>'amount')::integer;v_pledged:=(v_row->>'pledged')::integer;
 if v_amount<=0 or v_pledged<0 then raise exception '實收須大於零，認購金額不得為負';end if;
 if coalesce(v_row->>'received_on','')!~'^\d{4}-\d{2}-\d{2}$' then raise exception '日期須為 YYYY-MM-DD';end if;
 v_date:=(v_row->>'received_on')::date;
 if v_date>(now() at time zone 'Asia/Taipei')::date then raise exception '入帳日期不能在未來';end if;
 if nullif(trim(v_row->>'member_number'),'') is not null then
 select count(*),(array_agg(m.user_id))[1] into v_count,v_user from public.memberships m join public.profiles p on p.id=m.user_id where upper(trim(m.member_number))=upper(trim(v_row->>'member_number')) and p.is_active;
 if v_count<>1 then raise exception '會員編號查無唯一對應，請核對正式編號';end if;
 end if;
 if nullif(trim(v_row->>'email'),'') is not null then
 select count(*),(array_agg(id))[1] into v_count,v_email_user from public.profiles where lower(trim(email))=lower(trim(v_row->>'email')) and is_active;
 if v_count<>1 then raise exception '信箱查無唯一帳號，未註冊者須先完成對應';end if;
 if v_user is not null and v_user<>v_email_user then raise exception '會員編號與信箱指向不同帳號';end if;
 v_user:=coalesce(v_user,v_email_user);
 end if;
 if v_user is null then
 select count(*),(array_agg(l.user_id))[1] into v_count,v_user from private.donation_name_links l join public.profiles p on p.id=l.user_id where l.activity=trim(p_activity) and l.label=trim(v_row->>'name') and p.is_active;
 if v_count<>1 then v_user:=null;end if;
 end if;
 if v_user is null and nullif(trim(v_row->>'name'),'') is not null and (v_row->>'name')!~'[○Ｏ＊*]|[Oo]{2,}' then
 select count(*),(array_agg(id))[1] into v_count,v_user from public.profiles where is_active and regexp_replace(trim(display_name),'(先生|女士|小姐)$','')=regexp_replace(trim(v_row->>'name'),'(先生|女士|小姐)$','');
 if v_count<>1 then v_user:=null;end if;
 end if;
 if v_user is null then raise exception '姓名未能唯一配對或含遮蔽字，請補上帳號信箱核對';end if;
 if v_user=auth.uid() then raise exception '自己的捐款須由另一位管理員核實';end if;
 if exists(select 1 from private.donation_records where upper(trim(receipt_reference))=v_reference) then raise exception '收據／交易編號已登錄（含作廢紀錄）';end if;
 if (select count(*) from jsonb_array_elements(p_rows) x where upper(trim(x->>'reference'))=v_reference)>1 then raise exception '本批次內的收據／交易編號重複';end if;
 exception when others then v_issue:=sqlerrm;end;
 if v_issue is null then v_ready:=v_ready+1;v_total:=v_total+v_amount;end if;
 v_rows:=v_rows||jsonb_build_array(jsonb_build_object('row',v_index,'input',v_row,'user_id',v_user,'matched_name',(select display_name from public.profiles where id=v_user),'member_number',(select member_number from public.memberships where user_id=v_user),'issue',v_issue));
 end loop;
 return jsonb_build_object('rows',v_rows,'ready',v_ready,'count',v_index,'total_received',v_total,'digest',md5(trim(p_activity)||p_rows::text||v_rows::text));
end;$$;
create function public.admin_donation_import_commit(p_id uuid,p_activity text,p_rows jsonb,p_digest text,p_verified boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_preview jsonb;v_row jsonb;v_batch private.donation_import_batches%rowtype;v_id uuid;
begin
 if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 if p_verified is distinct from true or p_id is null then raise exception 'payment_verification_required';end if;
 perform pg_advisory_xact_lock(hashtextextended('donation_ingest',0));
 select * into v_batch from private.donation_import_batches where id=p_id;
 if found then
 if v_batch.activity<>trim(p_activity) or v_batch.rows<>p_rows or v_batch.digest<>p_digest then raise exception 'import_request_conflict';end if;
 return jsonb_build_object('id',p_id,'count',v_batch.record_count,'total_received',v_batch.total_received,'retry',true);
 end if;
 v_preview:=public.admin_donation_import_preview(p_activity,p_rows);
 if v_preview->>'digest' is distinct from p_digest then raise exception 'preview_changed_review_again';end if;
 if v_preview->>'ready'<>v_preview->>'count' then raise exception 'unresolved_import_rows';end if;
 insert into private.donation_import_batches values(p_id,trim(p_activity),p_digest,p_rows,auth.uid(),now(),(v_preview->>'count')::integer,(v_preview->>'total_received')::bigint);
 for v_row in select value from jsonb_array_elements(v_preview->'rows') loop
 insert into private.donation_records(user_id,amount,received_on,receipt_reference,note,verified_by,activity_name,pledged_amount,import_batch)
 values((v_row->>'user_id')::uuid,(v_row->'input'->>'amount')::integer,(v_row->'input'->>'received_on')::date,upper(trim(v_row->'input'->>'reference')),trim(v_row->'input'->>'note'),auth.uid(),trim(p_activity),(v_row->'input'->>'pledged')::integer,p_id);
 if nullif(trim(v_row->'input'->>'name'),'') is not null then
 insert into private.donation_name_links(activity,label,user_id,confirmed_by) values(trim(p_activity),trim(v_row->'input'->>'name'),(v_row->>'user_id')::uuid,auth.uid()) on conflict do nothing;
 end if;
 end loop;
 update private.donation_pledge_drafts set status='imported',updated_at=now() where id=p_id and created_by=auth.uid();
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(auth.uid(),'admin','donation_batch_imported','donation_import_batch',p_id::text,'整批核實實收入帳；未發共享點或 XP');
 return jsonb_build_object('id',p_id,'count',(v_preview->>'count')::integer,'total_received',(v_preview->>'total_received')::bigint,'retry',false);
end;$$;
revoke all on function public.admin_donation_import_preview(text,jsonb),public.admin_donation_import_commit(uuid,text,jsonb,text,boolean) from public,anon;
grant execute on function public.admin_donation_import_preview(text,jsonb),public.admin_donation_import_commit(uuid,text,jsonb,text,boolean) to authenticated;
-- Serialize legacy one-row imports with batches and normalize receipt identifiers.
alter function public.admin_donation_record(text,integer,date,text,text,boolean) set schema private;
revoke all on function private.admin_donation_record(text,integer,date,text,text,boolean) from public,anon,authenticated;
create function public.admin_donation_record(p_email text,p_amount integer,p_received date,p_reference text,p_note text,p_verified boolean) returns uuid language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 perform pg_advisory_xact_lock(hashtextextended('donation_ingest',0));
 if exists(select 1 from private.donation_records where upper(trim(receipt_reference))=upper(trim(p_reference))) then raise exception 'duplicate_donation_reference';end if;
 return private.admin_donation_record(p_email,p_amount,p_received,upper(trim(p_reference)),p_note,p_verified);
end;$$;
revoke all on function public.admin_donation_record(text,integer,date,text,text,boolean) from public,anon;
grant execute on function public.admin_donation_record(text,integer,date,text,text,boolean) to authenticated;

create or replace function public.donation_contribution_self()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_today date:=(now() at time zone 'Asia/Taipei')::date;
begin
 if auth.uid() is null then raise exception 'authentication_required';end if;
 return jsonb_build_object('verified_total',coalesce((select sum(amount) from private.donation_records where user_id=auth.uid() and status='verified'),0),
 'rules_active',exists(select 1 from private.donation_badge_rules where status='active' and effective_from<=v_today),
 'badges',coalesce((select jsonb_agg(to_jsonb(b)) from (select distinct on (r.period) r.label,r.period,
 case when r.period='annual' then extract(year from v_today)::integer end as year
 from private.donation_badge_rules r where r.status='active' and r.effective_from<=v_today and r.threshold<=coalesce((select sum(d.amount) from private.donation_records d where d.user_id=auth.uid() and d.status='verified'
 and (r.include_history or d.received_on>=r.effective_from) and (r.period='lifetime' or extract(year from d.received_on)=extract(year from v_today))),0)
 order by r.period,r.threshold desc,r.label) b),'[]'::jsonb),
 'records',coalesce((select jsonb_agg(jsonb_build_object('id',id,'amount',amount,'received_on',received_on,'receipt_reference',receipt_reference,'status',status,'void_note',void_note,'activity_name',activity_name,'pledged_amount',pledged_amount) order by received_on desc) from private.donation_records where user_id=auth.uid()),'[]'::jsonb));
end;$$;
