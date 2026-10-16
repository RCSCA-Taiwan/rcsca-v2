-- Taiwan calendar day quotas, transactional rewards, no XP grants or retroactive awards.
create table private.community_daily_slots(user_id uuid not null references public.profiles(id),day date not null,post_id uuid not null unique references private.community_posts(id) deferrable initially deferred,primary key(user_id,day));
create table private.community_point_awards(user_id uuid not null references public.profiles(id),post_id uuid not null references private.community_posts(id),kind text not null check(kind in ('topic','reply')),points integer not null,created_at timestamptz not null default now(),primary key(user_id,post_id,kind));
create table private.community_comments(id uuid primary key,user_id uuid not null references public.profiles(id),post_id uuid not null references private.community_posts(id),body text not null check(length(trim(body)) between 1 and 2000),hidden boolean not null default false,created_at timestamptz not null default now());
create index community_comments_thread_idx on private.community_comments(post_id,created_at desc,id desc);
create index community_comments_user_idx on private.community_comments(user_id);
create index community_awards_post_idx on private.community_point_awards(post_id);
alter table private.community_daily_slots enable row level security;
alter table private.community_point_awards enable row level security;
alter table private.community_comments enable row level security;
revoke all on private.community_daily_slots,private.community_point_awards,private.community_comments from public,anon,authenticated;
create unique index community_reward_once on public.point_transactions(user_id,source_type,source_id) where source_type in ('community_topic','community_reply');
create function private.community_award(p_user uuid,p_post uuid,p_kind text,p_points integer,p_actor uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 insert into private.community_point_awards(user_id,post_id,kind,points) values(p_user,p_post,p_kind,p_points) on conflict do nothing;
 if not found then return false;end if;
 insert into public.point_transactions(user_id,tx_type,points,source_type,source_id,description,created_by) values(p_user,'earn',p_points,'community_'||p_kind,p_post,case when p_kind='topic' then '論壇主題審核通過 +2' else '首次參與此主題留言 +1' end,p_actor);
 return true;
end;$$;
revoke all on function private.community_award(uuid,uuid,text,integer,uuid) from public,anon,authenticated;
create function private.community_daily_quota() returns trigger language plpgsql security definer set search_path='' as $$
declare v_day date:=(statement_timestamp() at time zone 'Asia/Taipei')::date;
begin
 perform 1 from public.profiles where id=new.user_id for no key update;
 if exists(select 1 from private.community_posts where user_id=new.user_id and created_at>=v_day::timestamp at time zone 'Asia/Taipei' and created_at<(v_day+1)::timestamp at time zone 'Asia/Taipei') then raise exception 'daily_topic_limit';end if;
 insert into private.community_daily_slots values(new.user_id,v_day,new.id) on conflict do nothing;
 if not found then raise exception 'daily_topic_limit';end if;
 return new;
end;$$;
revoke all on function private.community_daily_quota() from public,anon,authenticated;
create trigger community_daily_quota before insert on private.community_posts for each row execute function private.community_daily_quota();
create or replace function public.community_post_submit(p_id uuid,p_title text,p_body text,p_category text,p_images uuid[],p_consent boolean)
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

create or replace function public.admin_community_post_review(p_id uuid,p_status text,p_note text)
returns void language plpgsql security definer set search_path='' as $$
declare v_p private.community_posts%rowtype;
begin
 if auth.uid() is null or not private.is_admin('admin') then raise exception 'admin_required';end if;
 if p_status is null or p_status not in ('approved','rejected','hidden') or coalesce(length(trim(p_note)),0) not between 1 and 1000 then raise exception 'review_note_required';end if;
 select * into v_p from private.community_posts where id=p_id for update;
 if not found or v_p.status='withdrawn' then raise exception 'post_not_reviewable';end if;
 if v_p.user_id=auth.uid() then raise exception 'cannot_review_own_post';end if;
 if (p_status in ('approved','rejected') and v_p.status not in ('pending','rejected','hidden')) or (p_status='hidden' and v_p.status<>'approved') then raise exception 'invalid_status_transition';end if;
 perform 1 from public.profiles where id=v_p.user_id and is_active for no key update;
 if not found then raise exception 'author_inactive';end if;
 update private.community_posts set status=p_status,review_note=trim(p_note),reviewed_by=auth.uid(),updated_at=now() where id=p_id;
 if p_status='approved' then perform private.community_award(v_p.user_id,p_id,'topic',2,auth.uid());end if;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(auth.uid(),'admin','community_post_'||p_status,'community_post',p_id::text,trim(p_note));
end;$$;


create function public.community_daily_progress() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_day date:=(statement_timestamp() at time zone 'Asia/Taipei')::date;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and is_active) then raise exception 'authentication_required';end if;
 return jsonb_build_object('day',v_day,'topic_used',exists(select 1 from private.community_daily_slots where user_id=auth.uid() and day=v_day) or exists(select 1 from private.community_posts where user_id=auth.uid() and created_at>=v_day::timestamp at time zone 'Asia/Taipei' and created_at<(v_day+1)::timestamp at time zone 'Asia/Taipei'),'today_points',coalesce((select sum(points) from private.community_point_awards where user_id=auth.uid() and (created_at at time zone 'Asia/Taipei')::date=v_day),0),'today_reply_topics',(select count(*) from private.community_point_awards where user_id=auth.uid() and kind='reply' and (created_at at time zone 'Asia/Taipei')::date=v_day),'wallet',private.member_points_wallet(auth.uid()));
end;$$;
create function public.community_comment_submit(p_id uuid,p_post uuid,p_body text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_post private.community_posts%rowtype;v_existing private.community_comments%rowtype;v_awarded boolean:=false;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and is_active) then raise exception 'authentication_required';end if;
 if p_id is null or coalesce(length(trim(p_body)),0) not between 1 and 2000 then raise exception 'invalid_comment';end if;
 select * into v_post from private.community_posts where id=p_post for update;
 if not found or v_post.status<>'approved' then raise exception 'topic_not_open';end if;
 perform 1 from public.profiles where id=auth.uid() for no key update;
 select * into v_existing from private.community_comments where id=p_id;
 if found then
  if v_existing.user_id<>auth.uid() or v_existing.post_id<>p_post or v_existing.body<>trim(p_body) then raise exception 'existing_comment_differs';end if;
  return jsonb_build_object('id',p_id,'awarded',false,'retry',true);
 end if;
 insert into private.community_comments(id,user_id,post_id,body) values(p_id,auth.uid(),p_post,trim(p_body));
 if v_post.user_id<>auth.uid() then v_awarded:=private.community_award(auth.uid(),p_post,'reply',1,auth.uid());end if;
 return jsonb_build_object('id',p_id,'awarded',v_awarded,'retry',false);
end;$$;
create function public.community_thread(p_post uuid,p_before uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_before private.community_comments%rowtype;
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and is_active) then raise exception 'authentication_required';end if;
 if not exists(select 1 from private.community_posts where id=p_post and (status='approved' or private.is_admin('admin'))) then raise exception 'topic_not_open';end if;
 if p_before is not null then
 select * into v_before from private.community_comments where id=p_before and post_id=p_post;
 if not found then raise exception 'invalid_comment_cursor';end if;
 end if;
 return jsonb_build_object('rewarded',exists(select 1 from private.community_point_awards where user_id=auth.uid() and post_id=p_post and kind='reply'),'comments',coalesce((select jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id desc) from (select c.id,c.user_id,c.body,c.hidden,c.created_at,p.display_name from private.community_comments c join public.profiles p on p.id=c.user_id where c.post_id=p_post and (not c.hidden or private.is_admin('admin')) and (p_before is null or (c.created_at,c.id)<(v_before.created_at,v_before.id)) order by c.created_at desc,c.id desc limit 30) x),'[]'::jsonb));
end;$$;
create function public.community_comment_hide(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and is_active) then raise exception 'authentication_required';end if;
 update private.community_comments set hidden=true where id=p_id and (user_id=auth.uid() or private.is_admin('admin'));
 if not found then raise exception 'comment_access_denied';end if;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(auth.uid(),'user','community_comment_hidden','community_comment',p_id::text,'留言隱藏；保留已得分資格避免重複領取');
end;$$;
revoke all on function public.community_daily_progress(),public.community_comment_submit(uuid,uuid,text),public.community_thread(uuid,uuid),public.community_comment_hide(uuid) from public,anon;
grant execute on function public.community_daily_progress(),public.community_comment_submit(uuid,uuid,text),public.community_thread(uuid,uuid),public.community_comment_hide(uuid) to authenticated;
-- Public catalogue must not evaluate an admin-only helper for anonymous visitors.
drop policy "approved rewards public read" on public.reward_catalog;
create policy "approved rewards public read" on public.reward_catalog for select to authenticated using(status='approved'::public.review_status or private.is_admin(null));
create policy "anonymous approved rewards" on public.reward_catalog for select to anon using(status='approved'::public.review_status);
