create table private.community_posts (
 id uuid primary key,user_id uuid not null references public.profiles(id),title text not null check(length(trim(title)) between 1 and 120),body text not null check(length(trim(body)) between 1 and 5000),
 category text not null check(category in ('sharing','activity')),status text not null default 'pending' check(status in ('pending','approved','rejected','hidden','withdrawn')),
 publish_consent_at timestamptz not null default now(),review_note text,reviewed_by uuid references public.profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table private.community_images (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),post_id uuid references private.community_posts(id),object_path text not null unique,created_at timestamptz not null default now()
);
create table private.community_reports (
 id uuid primary key default gen_random_uuid(),post_id uuid not null references private.community_posts(id),user_id uuid not null references public.profiles(id),reason text not null check(length(trim(reason)) between 1 and 1000),created_at timestamptz not null default now(),unique(post_id,user_id)
);
create index community_posts_user_idx on private.community_posts(user_id,created_at);
create index community_posts_status_idx on private.community_posts(status,created_at);
create index community_images_user_idx on private.community_images(user_id);
create index community_images_post_idx on private.community_images(post_id);
create index community_reports_user_idx on private.community_reports(user_id);
alter table private.community_posts enable row level security;
alter table private.community_images enable row level security;
alter table private.community_reports enable row level security;
revoke all on private.community_posts,private.community_images,private.community_reports from public,anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('community-media','community-media',false,2097152,array['image/jpeg']);

create function private.community_image_readable(p_path text)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.profiles where id=auth.uid() and is_active) and exists(
 select 1 from private.community_images i left join private.community_posts p on p.id=i.post_id where i.object_path=p_path and (i.user_id=auth.uid() or p.status='approved' or private.is_admin('admin')));
$$;
revoke all on function private.community_image_readable(text) from public,anon;
grant execute on function private.community_image_readable(text) to authenticated;
create policy community_image_upload on storage.objects for insert to authenticated with check(bucket_id='community-media' and (storage.foldername(name))[1]=auth.uid()::text and exists(select 1 from public.profiles where id=auth.uid() and is_active));
create policy community_image_read on storage.objects for select to authenticated using(bucket_id='community-media' and private.community_image_readable(name));
-- Avoid exposing private tables inside storage policies.
create function private.community_image_unused(p_path text)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and split_part(p_path,'/',1)=auth.uid()::text and not exists(select 1 from private.community_images where object_path=p_path and post_id is not null);
$$;
revoke all on function private.community_image_unused(text) from public,anon;
grant execute on function private.community_image_unused(text) to authenticated;
create policy community_unused_image_delete on storage.objects for delete to authenticated using(bucket_id='community-media' and private.community_image_unused(name));

create function public.community_image_register(p_path text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and is_active) then raise exception 'authentication_required';end if;
 if split_part(p_path,'/',1)<>auth.uid()::text or p_path!~'^[0-9a-f-]{36}/[0-9a-f-]{36}\.jpg$' then raise exception 'invalid_image_path';end if;
 if not exists(select 1 from storage.objects where bucket_id='community-media' and name=p_path and (metadata->>'mimetype')='image/jpeg' and (metadata->>'size')::bigint between 1 and 2097152) then raise exception 'image_upload_required';end if;
 insert into private.community_images(user_id,object_path) values(auth.uid(),p_path) on conflict(object_path) do update set object_path=excluded.object_path returning id into v_id;
 return v_id;
end;$$;

create function public.community_post_submit(p_id uuid,p_title text,p_body text,p_category text,p_images uuid[],p_consent boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_existing private.community_posts%rowtype;v_count integer;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and is_active) then raise exception 'authentication_required';end if;
 if p_consent is distinct from true then raise exception 'publication_consent_required';end if;
 if p_id is null or coalesce(length(trim(p_title)),0) not between 1 and 120 or coalesce(length(trim(p_body)),0) not between 1 and 5000 or p_category is null or p_category not in ('sharing','activity') or coalesce(cardinality(p_images),0)>4 then raise exception 'invalid_community_post';end if;
 perform 1 from public.profiles where id=auth.uid() for no key update;
 select * into v_existing from private.community_posts where id=p_id;
 if found then
  if v_existing.user_id<>auth.uid() then raise exception 'post_access_denied';end if;
  if v_existing.title<>trim(p_title) or v_existing.body<>trim(p_body) or v_existing.category<>p_category then raise exception 'existing_submission_differs';end if;
  return p_id;
 end if;
 select count(distinct id) into v_count from private.community_images where id=any(p_images) and user_id=auth.uid() and post_id is null;
 if v_count<>coalesce(cardinality(p_images),0) then raise exception 'image_not_owned_or_attached';end if;
 insert into private.community_posts(id,user_id,title,body,category) values(p_id,auth.uid(),trim(p_title),trim(p_body),p_category);
 update private.community_images set post_id=p_id where id=any(p_images) and user_id=auth.uid();
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(auth.uid(),'user','community_post_submitted','community_post',p_id::text,'待審核；未發放點數或 XP');
 return p_id;
end;$$;

create function public.community_posts_list(p_manage boolean default false)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and is_active) then raise exception 'authentication_required';end if;
 if p_manage and not private.is_admin('admin') then raise exception 'admin_required';end if;
 return coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc) from (
 select p.id,p.user_id,p.title,p.body,p.category,p.status,p.review_note,p.created_at,u.display_name,
 coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'path',i.object_path)) from private.community_images i where i.post_id=p.id),'[]'::jsonb) as images,
 case when p_manage then coalesce((select jsonb_agg(jsonb_build_object('reason',r.reason,'created_at',r.created_at)) from private.community_reports r where r.post_id=p.id),'[]'::jsonb) else '[]'::jsonb end as reports
 from private.community_posts p join public.profiles u on u.id=p.user_id where p_manage or p.status='approved' or p.user_id=auth.uid() order by p.created_at desc limit 50) x),'[]'::jsonb);
end;$$;

create function public.community_post_withdraw(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and is_active) then raise exception 'authentication_required';end if;
 update private.community_posts set status='withdrawn',updated_at=now() where id=p_id and user_id=auth.uid() and status<>'withdrawn';
 if not found then raise exception 'post_not_withdrawable';end if;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(auth.uid(),'user','community_post_withdrawn','community_post',p_id::text,'本人撤回');
end;$$;

create function public.admin_community_post_review(p_id uuid,p_status text,p_note text)
returns void language plpgsql security definer set search_path='' as $$
declare v_p private.community_posts%rowtype;
begin
 if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 if p_status is null or p_status not in ('approved','rejected','hidden') or coalesce(length(trim(p_note)),0) not between 1 and 1000 then raise exception 'review_note_required';end if;
 select * into v_p from private.community_posts where id=p_id for update;
 if not found or v_p.status='withdrawn' then raise exception 'post_not_reviewable';end if;
 if v_p.user_id=auth.uid() then raise exception 'cannot_review_own_post';end if;
 if (p_status in ('approved','rejected') and v_p.status not in ('pending','rejected','hidden')) or (p_status='hidden' and v_p.status<>'approved') then raise exception 'invalid_status_transition';end if;
 update private.community_posts set status=p_status,review_note=trim(p_note),reviewed_by=auth.uid(),updated_at=now() where id=p_id;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(auth.uid(),'admin','community_post_'||p_status,'community_post',p_id::text,trim(p_note));
end;$$;

create function public.community_post_report(p_id uuid,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and is_active) then raise exception 'authentication_required';end if;
 if coalesce(length(trim(p_reason)),0) not between 1 and 1000 or not exists(select 1 from private.community_posts where id=p_id and status='approved') then raise exception 'invalid_report';end if;
 insert into private.community_reports(post_id,user_id,reason) values(p_id,auth.uid(),trim(p_reason)) on conflict(post_id,user_id) do update set reason=excluded.reason,created_at=now();
end;$$;
revoke all on function public.community_image_register(text),public.community_post_submit(uuid,text,text,text,uuid[],boolean),public.community_posts_list(boolean),public.community_post_withdraw(uuid),public.admin_community_post_review(uuid,text,text),public.community_post_report(uuid,text) from public,anon;
grant execute on function public.community_image_register(text),public.community_post_submit(uuid,text,text,text,uuid[],boolean),public.community_posts_list(boolean),public.community_post_withdraw(uuid),public.admin_community_post_review(uuid,text,text),public.community_post_report(uuid,text) to authenticated;
