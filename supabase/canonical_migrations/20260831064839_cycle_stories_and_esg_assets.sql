-- Canonical export recovered read-only from Staging migration history.
-- Version: 20260831064839; name: cycle_stories_and_esg_assets

-- V200: publish-safe Cycle of Goodness stories and enterprise ESG deliverables.
create table if not exists public.cycle_stories (
 id uuid primary key default gen_random_uuid(),
 title text not null,
 summary text not null,
 role_flow text[] not null default '{}',
 source_type text not null,
 source_id uuid,
 status public.review_status not null default 'draft',
 consent_confirmed boolean not null default false,
 anonymized boolean not null default true,
 published_at timestamptz,
 created_by uuid references public.profiles(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (status <> 'approved' or consent_confirmed = true)
);

create table if not exists public.enterprise_esg_assets (
 id uuid primary key default gen_random_uuid(),
 enterprise_id uuid not null references public.enterprises(id) on delete cascade,
 title text not null,
 asset_type text not null,
 period_label text,
 summary text,
 source_type text,
 source_id uuid,
 status public.review_status not null default 'draft',
 created_by uuid references public.profiles(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);

alter table public.cycle_stories enable row level security;
alter table public.enterprise_esg_assets enable row level security;

create policy "cycle stories public approved" on public.cycle_stories for select using (status='approved' and consent_confirmed=true);
create policy "cycle stories admin manage" on public.cycle_stories for all to authenticated using (private.is_admin(null)) with check (private.is_admin(null));
create policy "esg assets enterprise read" on public.enterprise_esg_assets for select to authenticated using (private.is_enterprise_user(enterprise_id) or private.is_admin(null));
create policy "esg assets admin manage" on public.enterprise_esg_assets for all to authenticated using (private.is_admin(null)) with check (private.is_admin(null));

create index if not exists idx_cycle_stories_public on public.cycle_stories(status,consent_confirmed,published_at desc);
create index if not exists idx_esg_assets_enterprise_status on public.enterprise_esg_assets(enterprise_id,status,created_at desc);

create or replace function public.admin_publish_cycle_story(p_story_id uuid,p_publish boolean,p_note text default null) returns void language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); v_story public.cycle_stories%rowtype;
begin
 if v_actor is null or not exists(select 1 from public.admin_roles where user_id=v_actor and role_key in ('super_admin','admin','content_manager')) then raise exception 'insufficient_privilege'; end if;
 select * into v_story from public.cycle_stories where id=p_story_id for update; if not found then raise exception 'story_not_found'; end if;
 if p_publish and not v_story.consent_confirmed then raise exception 'consent_required'; end if;
 update public.cycle_stories set status=case when p_publish then 'approved'::public.review_status else 'draft'::public.review_status end,published_at=case when p_publish then now() else null end,updated_at=now() where id=p_story_id;
 insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note) values(v_actor,'content_manager',case when p_publish then 'publish_cycle_story' else 'unpublish_cycle_story' end,'cycle_story',p_story_id::text,p_note);
end;$$;
revoke all on function public.admin_publish_cycle_story(uuid,boolean,text) from public,anon;
grant execute on function public.admin_publish_cycle_story(uuid,boolean,text) to authenticated;
