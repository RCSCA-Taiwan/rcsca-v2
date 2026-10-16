-- Periodic offers are reviewed independently from partner eligibility.
-- Approved versions are immutable; the next period always creates a new catalog item.
create table private.partner_period_offers (
 id uuid primary key,
 enterprise_id uuid not null references public.enterprises(id),
 provider_user_id uuid not null references public.profiles(id),
 details jsonb not null,
 state text not null check(state in ('draft','submitted','needs_info','approved','rejected','withdraw_requested','withdrawn','cancelled')),
 revision integer not null default 1,
 request_id uuid not null,
 request_hash text not null,
 review_note text,
 reward_id uuid unique references public.reward_catalog(id),
 reviewed_by uuid references public.profiles(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index partner_period_offers_enterprise_idx on private.partner_period_offers(enterprise_id,updated_at desc);
alter table private.partner_period_offers enable row level security;
revoke all on private.partner_period_offers from public,anon,authenticated;

create function private.partner_offer_member(p_enterprise uuid,p_write boolean default false)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.enterprise_users u join public.enterprises e on e.id=u.enterprise_id
 where u.enterprise_id=p_enterprise and u.user_id=auth.uid() and e.status='approved'
 and (not p_write or u.role in ('manager','editor')))
 and exists(select 1 from public.profiles where id=auth.uid() and is_active);
$$;
revoke all on function private.partner_offer_member(uuid,boolean) from public,anon;
grant execute on function private.partner_offer_member(uuid,boolean) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('partner-offer-media','partner-offer-media',false,2097152,array['image/jpeg']);

create function private.partner_offer_image_readable(p_path text)
returns boolean language plpgsql stable security definer set search_path='' as $$
begin
 if exists(select 1 from private.partner_period_offers o join public.reward_catalog c on c.id=o.reward_id
 where o.state in ('approved','withdraw_requested') and c.status='approved' and o.details->'images' ? p_path) then return true;end if;
 if auth.uid() is null then return false;end if;
 return split_part(p_path,'/',1)=auth.uid()::text or private.is_admin('admin') or exists(
 select 1 from private.partner_period_offers o where o.details->'images' ? p_path and private.partner_offer_member(o.enterprise_id,false));
end;$$;
revoke all on function private.partner_offer_image_readable(text) from public;
grant execute on function private.partner_offer_image_readable(text) to anon,authenticated;
create policy partner_offer_image_read on storage.objects for select to anon,authenticated
using(bucket_id='partner-offer-media' and private.partner_offer_image_readable(name));
create policy partner_offer_image_upload on storage.objects for insert to authenticated
with check(bucket_id='partner-offer-media' and name~'^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$'
and split_part(name,'/',1)=auth.uid()::text and exists(select 1 from public.enterprise_users u where u.user_id=auth.uid() and private.partner_offer_member(u.enterprise_id,true)));
create function private.partner_offer_image_unused(p_path text)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and split_part(p_path,'/',1)=auth.uid()::text
 and not exists(select 1 from private.partner_period_offers where details->'images' ? p_path);
$$;
revoke all on function private.partner_offer_image_unused(text) from public,anon;
grant execute on function private.partner_offer_image_unused(text) to authenticated;
create policy partner_offer_unused_image_delete on storage.objects for delete to authenticated
using(bucket_id='partner-offer-media' and private.partner_offer_image_unused(name));

create function public.partner_offer_list(p_enterprise uuid default null,p_manage boolean default false)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'login_required';end if;
 if p_manage and not private.is_admin('admin') then raise exception 'admin_required';end if;
 if not p_manage and not private.partner_offer_member(p_enterprise,false) then raise exception 'enterprise_required';end if;
 return coalesce((select jsonb_agg(to_jsonb(o)||jsonb_build_object('enterprise_name',coalesce(e.display_name,e.legal_name),
 'point_cost',c.point_cost,'stock_remaining',c.stock_remaining,'catalog_status',c.status) order by o.updated_at desc)
 from private.partner_period_offers o join public.enterprises e on e.id=o.enterprise_id
 left join public.reward_catalog c on c.id=o.reward_id where p_manage or o.enterprise_id=p_enterprise),'[]'::jsonb);
end;$$;

create function public.partner_offer_save(p_id uuid,p_enterprise uuid,p_details jsonb,p_submit boolean,p_revision integer,p_request uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_old private.partner_period_offers%rowtype;v_data jsonb;v_hash text;v_images jsonb;v_path text;v_quantity integer;v_start timestamptz;v_end timestamptz;v_service_start timestamptz;v_service_end timestamptz;
begin
 if not private.partner_offer_member(p_enterprise,true) then raise exception 'enterprise_editor_required';end if;
 if p_id is null or p_request is null or p_submit is null or jsonb_typeof(p_details)<>'object' then raise exception 'invalid_offer';end if;
 v_images:=coalesce(p_details->'images','[]'::jsonb);
 if jsonb_typeof(v_images)<>'array' or jsonb_array_length(v_images)>4 then raise exception 'invalid_images';end if;
 if coalesce(length(trim(p_details->>'title')),0) not between 1 and 120
 or length(coalesce(p_details->>'description',''))>3000 or length(coalesce(p_details->>'period',''))>80
 or length(coalesce(p_details->>'terms',''))>1000 or length(coalesce(p_details->>'shipping_note',''))>500 then raise exception 'invalid_offer';end if;
 v_quantity:=nullif(p_details->>'quantity','')::integer;
 v_start:=nullif(p_details->>'starts_at','')::timestamptz;v_end:=nullif(p_details->>'ends_at','')::timestamptz;
 if v_quantity is not null and v_quantity not between 1 and 100000 then raise exception 'invalid_quantity';end if;
 if (v_start is not null and not isfinite(v_start)) or (v_end is not null and not isfinite(v_end)) or (v_start is not null and v_end is not null and v_end<=v_start) then raise exception 'invalid_period';end if;
 if p_submit and (coalesce(length(trim(p_details->>'description')),0)=0 or coalesce(length(trim(p_details->>'period')),0)=0
 or v_quantity is null or v_start is null or v_end is null or v_end<=now() or coalesce(p_details->>'mode','') not in ('service','delivery')
 or coalesce(length(trim(p_details->>'terms')),0)=0 or (p_details->>'mode'='delivery' and coalesce(length(trim(p_details->>'shipping_note')),0)=0)) then raise exception 'complete_offer_required';end if;
 if coalesce(p_details->>'shipping_policy','free') not in ('free','recipient_pays','included_points') then raise exception 'invalid_shipping';end if;
 v_service_start:=nullif(p_details->>'service_starts_at','')::timestamptz;v_service_end:=nullif(p_details->>'service_ends_at','')::timestamptz;
 if p_submit and p_details->>'mode'='service' and (v_quantity>100 or v_service_start is null or v_service_end is null or not isfinite(v_service_start) or not isfinite(v_service_end)
 or v_service_start<greatest(v_start,now()) or v_service_end<=v_service_start or v_service_end>v_end) then raise exception 'invalid_service_slot';end if;
 for v_path in select jsonb_array_elements_text(v_images) loop
  if v_path!~'^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$' or not exists(select 1 from storage.objects where bucket_id='partner-offer-media' and name=v_path and metadata->>'mimetype'='image/jpeg' and (metadata->>'size')::bigint between 1 and 2097152)
  or not (split_part(v_path,'/',1)=auth.uid()::text or exists(select 1 from private.partner_period_offers where enterprise_id=p_enterprise and details->'images' ? v_path)) then raise exception 'image_not_owned_or_uploaded';end if;
 end loop;
 v_data:=jsonb_build_object('title',trim(p_details->>'title'),'description',trim(coalesce(p_details->>'description','')),
 'period',trim(coalesce(p_details->>'period','')),'quantity',v_quantity,'starts_at',v_start,'ends_at',v_end,
 'mode',coalesce(p_details->>'mode','delivery'),'terms',trim(coalesce(p_details->>'terms','')),'images',v_images,
 'shipping_policy',coalesce(p_details->>'shipping_policy','free'),'shipping_note',trim(coalesce(p_details->>'shipping_note','')),
 'service_starts_at',v_service_start,'service_ends_at',v_service_end);
 v_hash:=md5(jsonb_build_object('details',v_data,'submit',p_submit)::text);
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 select * into v_old from private.partner_period_offers where id=p_id for update;
 if found then
  if v_old.enterprise_id<>p_enterprise then raise exception 'offer_not_owned';end if;
  if v_old.request_id=p_request then if v_old.request_hash=v_hash then return p_id;else raise exception 'request_conflict';end if;end if;
  if v_old.state not in ('draft','needs_info') or p_revision is distinct from v_old.revision then raise exception 'offer_changed_reload';end if;
  update private.partner_period_offers set details=v_data,state=case when p_submit then 'submitted' else 'draft' end,
  revision=revision+1,request_id=p_request,request_hash=v_hash,updated_at=now() where id=p_id;
 else
  if p_revision is distinct from 0 then raise exception 'offer_changed_reload';end if;
  insert into private.partner_period_offers(id,enterprise_id,provider_user_id,details,state,request_id,request_hash)
  values(p_id,p_enterprise,auth.uid(),v_data,case when p_submit then 'submitted' else 'draft' end,p_request,v_hash);
 end if;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id) values(auth.uid(),'enterprise',case when p_submit then 'offer_submitted' else 'offer_draft_saved' end,'partner_offer',p_id::text);
 return p_id;
end;$$;

create function public.partner_offer_request_action(p_id uuid,p_action text,p_revision integer)
returns void language plpgsql security definer set search_path='' as $$
declare v_old private.partner_period_offers%rowtype;
begin
 select * into v_old from private.partner_period_offers where id=p_id for update;
 if not found or not private.partner_offer_member(v_old.enterprise_id,true) then raise exception 'enterprise_editor_required';end if;
 if p_revision is distinct from v_old.revision then raise exception 'offer_changed_reload';end if;
 if p_action='withdraw' and v_old.state='approved' then
  update private.partner_period_offers set state='withdraw_requested',revision=revision+1,updated_at=now() where id=p_id;
 elsif p_action='cancel' and v_old.state in ('draft','submitted','needs_info') then
  update private.partner_period_offers set state='cancelled',revision=revision+1,updated_at=now() where id=p_id;
 else raise exception 'invalid_offer_transition';end if;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id) values(auth.uid(),'enterprise','offer_'||p_action,'partner_offer',p_id::text);
end;$$;

create function public.admin_partner_offer_review(p_id uuid,p_action text,p_note text,p_points integer,p_revision integer)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_old private.partner_period_offers%rowtype;v_data jsonb;v_reward uuid;v_email text;
begin
 if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 select * into v_old from private.partner_period_offers where id=p_id for update;
 if not found or v_old.revision is distinct from p_revision then raise exception 'offer_changed_reload';end if;
 if v_old.provider_user_id=auth.uid() then raise exception 'independent_reviewer_required';end if;
 if p_action is null or p_action not in ('approve','needs_info','reject','withdraw','keep') or length(coalesce(p_note,''))>1000 then raise exception 'invalid_review';end if;
 if p_action<>'approve' and coalesce(length(trim(p_note)),0)=0 then raise exception 'review_note_required';end if;
 if v_old.state='submitted' and p_action in ('approve','needs_info','reject') then
  if p_action='approve' then
   if p_points is null or p_points not between 0 and 1000000 then raise exception 'invalid_points';end if;
   if not exists(select 1 from public.enterprises where id=v_old.enterprise_id and status='approved') then raise exception 'enterprise_not_approved';end if;
   select p.email into v_email from public.profiles p join public.enterprise_users u on u.user_id=p.id
   where p.id=v_old.provider_user_id and p.is_active and u.enterprise_id=v_old.enterprise_id and u.role in ('manager','editor');
   if v_email is null then raise exception 'active_provider_required';end if;
   v_data:=v_old.details;
   if (v_data->>'ends_at')::timestamptz<=now() then raise exception 'offer_expired';end if;
   v_reward:=public.admin_upsert_reward_with_fulfillment(jsonb_build_object('category','daily','title',v_data->>'title',
   'description',(v_data->>'description')||E'\n\n適用條件：'||(v_data->>'terms'),'point_cost',p_points,'stock_total',(v_data->>'quantity')::integer,
   'min_level',1,'min_footprints',0,'status','approved','starts_at',v_data->>'starts_at','ends_at',v_data->>'ends_at'),
   jsonb_build_object('mode',v_data->>'mode','provider_email',v_email,'shipping_policy',v_data->>'shipping_policy','shipping_note',v_data->>'shipping_note','hold_hours',24));
   if v_data->>'mode'='service' then
    perform public.admin_reward_slot_add(v_reward,(v_data->>'service_starts_at')::timestamptz,(v_data->>'service_ends_at')::timestamptz,(v_data->>'quantity')::integer);
   end if;
  end if;
  update private.partner_period_offers set state=case p_action when 'approve' then 'approved' when 'needs_info' then 'needs_info' else 'rejected' end,
  reward_id=v_reward,review_note=nullif(trim(p_note),''),reviewed_by=auth.uid(),revision=revision+1,updated_at=now() where id=p_id;
 elsif v_old.state='withdraw_requested' and p_action in ('withdraw','keep') then
  if p_action='withdraw' then update public.reward_catalog set status='rejected',updated_at=now() where id=v_old.reward_id;end if;
  v_reward:=v_old.reward_id;
  update private.partner_period_offers set state=case when p_action='withdraw' then 'withdrawn' else 'approved' end,
  review_note=trim(p_note),reviewed_by=auth.uid(),revision=revision+1,updated_at=now() where id=p_id;
 else raise exception 'invalid_offer_transition';end if;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(auth.uid(),'admin','offer_review_'||p_action,'partner_offer',p_id::text,p_note);
 insert into public.user_notifications(recipient_user_id,kind,title,body,related_type,related_id)
 values(v_old.provider_user_id,'partner_offer','本期共享項目審核已更新','請至「我的每期供應」查看狀態、審核說明與核定點數。','partner_offer',p_id)
 on conflict(recipient_user_id,kind,related_type,related_id) where related_id is not null do update set title=excluded.title,body=excluded.body,read_at=null,created_at=now();
 return v_reward;
end;$$;

create function private.guard_partner_period_catalog()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from private.partner_period_offers where reward_id=old.id) and
 (to_jsonb(new)-array['stock_remaining','status','updated_at']) is distinct from (to_jsonb(old)-array['stock_remaining','status','updated_at']) then
 raise exception 'period_item_immutable_create_next_period';end if;
 return new;
end;$$;
revoke all on function private.guard_partner_period_catalog() from public,anon,authenticated;
create trigger guard_partner_period_catalog before update on public.reward_catalog for each row execute function private.guard_partner_period_catalog();

create function public.public_partner_offer_media()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('reward_id',o.reward_id,'images',o.details->'images','period',o.details->>'period',
 'enterprise_name',coalesce(e.display_name,e.legal_name),'available_quantity',case when c.stock_remaining is null then null else greatest(0,c.stock_remaining-(select count(*)::integer from private.reward_fulfillment f join public.reward_redemptions r on r.id=f.redemption_id
 where r.reward_id=c.id and r.status='submitted' and f.fulfillment_type='service' and f.hold_until>now() and (r.points_expires_at is null or r.points_expires_at>now()))) end)),'[]'::jsonb)
 from private.partner_period_offers o join public.reward_catalog c on c.id=o.reward_id join public.enterprises e on e.id=o.enterprise_id
 where o.state in ('approved','withdraw_requested') and c.status='approved';
$$;
revoke all on function public.partner_offer_list(uuid,boolean),public.partner_offer_save(uuid,uuid,jsonb,boolean,integer,uuid),
public.partner_offer_request_action(uuid,text,integer),public.admin_partner_offer_review(uuid,text,text,integer,integer),public.public_partner_offer_media() from public,anon;
grant execute on function public.partner_offer_list(uuid,boolean),public.partner_offer_save(uuid,uuid,jsonb,boolean,integer,uuid),
public.partner_offer_request_action(uuid,text,integer),public.admin_partner_offer_review(uuid,text,text,integer,integer) to authenticated;
grant execute on function public.public_partner_offer_media() to anon,authenticated;
