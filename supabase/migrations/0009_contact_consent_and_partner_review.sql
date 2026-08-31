-- V160: bilateral contact consent, enterprise-share review, and user notifications.

create table if not exists public.network_contact_consents (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.network_match_responses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  consented boolean not null default false,
  consented_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(response_id,user_id)
);

create table if not exists public.network_contact_reveals (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.network_match_responses(id) on delete cascade,
  visible_to_user_id uuid not null references public.profiles(id) on delete cascade,
  counterparty_user_id uuid not null references public.profiles(id) on delete cascade,
  counterparty_display_name text,
  counterparty_email text,
  counterparty_mobile text,
  created_at timestamptz not null default now(),
  unique(response_id,visible_to_user_id)
);

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  related_type text,
  related_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_contact_consents_response on public.network_contact_consents(response_id,user_id);
create index if not exists idx_contact_reveals_visible on public.network_contact_reveals(visible_to_user_id,created_at desc);
create index if not exists idx_notifications_recipient on public.user_notifications(recipient_user_id,created_at desc);

alter table public.network_contact_consents enable row level security;
alter table public.network_contact_reveals enable row level security;
alter table public.user_notifications enable row level security;

grant select, insert, update on public.network_contact_consents to authenticated;
grant select on public.network_contact_reveals to authenticated;
grant select, update on public.user_notifications to authenticated;

drop policy if exists "contact consent participants read" on public.network_contact_consents;
create policy "contact consent participants read" on public.network_contact_consents
for select to authenticated using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.network_match_responses r
    join public.network_requests q on q.id = r.request_id
    where r.id = response_id
      and (r.responder_user_id = (select auth.uid()) or q.requester_user_id = (select auth.uid()))
  )
  or private.is_admin(null)
);

drop policy if exists "contact consent self write" on public.network_contact_consents;
create policy "contact consent self write" on public.network_contact_consents
for insert to authenticated with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.network_match_responses r
    join public.network_requests q on q.id = r.request_id
    where r.id = response_id
      and (r.responder_user_id = (select auth.uid()) or q.requester_user_id = (select auth.uid()))
  )
);

drop policy if exists "contact consent self update" on public.network_contact_consents;
create policy "contact consent self update" on public.network_contact_consents
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists "contact reveal participant read" on public.network_contact_reveals;
create policy "contact reveal participant read" on public.network_contact_reveals
for select to authenticated using (visible_to_user_id = (select auth.uid()) or private.is_admin(null));

drop policy if exists "notifications own read" on public.user_notifications;
create policy "notifications own read" on public.user_notifications
for select to authenticated using (recipient_user_id = (select auth.uid()) or private.is_admin(null));

drop policy if exists "notifications own update" on public.user_notifications;
create policy "notifications own update" on public.user_notifications
for update to authenticated
using (recipient_user_id = (select auth.uid()))
with check (recipient_user_id = (select auth.uid()));

create or replace function private.sync_contact_exchange(p_response_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_response public.network_match_responses%rowtype;
  v_requester uuid;
  v_both boolean;
begin
  select * into v_response from public.network_match_responses where id = p_response_id;
  if not found then return; end if;
  select requester_user_id into v_requester from public.network_requests where id = v_response.request_id;
  if v_requester is null then return; end if;

  select count(*) = 2 into v_both
  from public.network_contact_consents c
  where c.response_id = p_response_id
    and c.consented = true
    and c.user_id in (v_requester, v_response.responder_user_id);

  if not v_both then
    update public.network_match_responses set contact_exchange_allowed=false,updated_at=now() where id=p_response_id;
    delete from public.network_contact_reveals where response_id=p_response_id;
    return;
  end if;

  update public.network_match_responses set contact_exchange_allowed=true,status='matched',updated_at=now() where id=p_response_id;

  insert into public.network_contact_reveals(response_id,visible_to_user_id,counterparty_user_id,counterparty_display_name,counterparty_email,counterparty_mobile)
  select p_response_id,v_requester,p.id,p.display_name,p.email,p.mobile from public.profiles p where p.id=v_response.responder_user_id
  on conflict (response_id,visible_to_user_id) do update set counterparty_display_name=excluded.counterparty_display_name,counterparty_email=excluded.counterparty_email,counterparty_mobile=excluded.counterparty_mobile;

  insert into public.network_contact_reveals(response_id,visible_to_user_id,counterparty_user_id,counterparty_display_name,counterparty_email,counterparty_mobile)
  select p_response_id,v_response.responder_user_id,p.id,p.display_name,p.email,p.mobile from public.profiles p where p.id=v_requester
  on conflict (response_id,visible_to_user_id) do update set counterparty_display_name=excluded.counterparty_display_name,counterparty_email=excluded.counterparty_email,counterparty_mobile=excluded.counterparty_mobile;

  insert into public.user_notifications(recipient_user_id,kind,title,body,related_type,related_id)
  values
    (v_requester,'network_contact_ready','雙方已同意交換聯絡方式','你可以在媒合頁查看對方已同意公開的聯絡資訊。','network_match_response',p_response_id),
    (v_response.responder_user_id,'network_contact_ready','雙方已同意交換聯絡方式','你可以在媒合頁查看對方已同意公開的聯絡資訊。','network_match_response',p_response_id);
end;
$$;
revoke all on function private.sync_contact_exchange(uuid) from public,anon,authenticated;

create or replace function private.before_contact_consent_change()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  new.updated_at = now();
  new.consented_at = case when new.consented then coalesce(new.consented_at,now()) else null end;
  return new;
end;
$$;
revoke all on function private.before_contact_consent_change() from public,anon,authenticated;

create or replace function private.after_contact_consent_change()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  perform private.sync_contact_exchange(new.response_id);
  return new;
end;
$$;
revoke all on function private.after_contact_consent_change() from public,anon,authenticated;

drop trigger if exists trg_contact_consent_stamp on public.network_contact_consents;
create trigger trg_contact_consent_stamp
before insert or update of consented on public.network_contact_consents
for each row execute function private.before_contact_consent_change();

drop trigger if exists trg_contact_consent_sync on public.network_contact_consents;
create trigger trg_contact_consent_sync
after insert or update of consented on public.network_contact_consents
for each row execute function private.after_contact_consent_change();

create or replace function public.admin_review_enterprise_share(
  p_share_id uuid,
  p_decision text,
  p_public_result boolean default false,
  p_note text default null
) returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_actor uuid := auth.uid();
  v_share public.enterprise_shares%rowtype;
  v_status public.review_status;
begin
  if v_actor is null or not private.is_admin(null) then raise exception 'insufficient_privilege'; end if;
  if p_decision not in ('approved','needs_info','rejected') then raise exception 'invalid_decision'; end if;
  v_status := p_decision::public.review_status;
  select * into v_share from public.enterprise_shares where id=p_share_id for update;
  if not found then raise exception 'share_not_found'; end if;

  update public.enterprise_shares
  set status=v_status,
      public_result=case when v_status='approved' then p_public_result else false end
  where id=p_share_id;

  insert into public.audit_logs(actor_user_id,actor_role,action,subject_type,subject_id,note)
  values(v_actor,'admin','review_enterprise_share','enterprise_share',p_share_id::text,coalesce(p_note,p_decision));

  insert into public.user_notifications(recipient_user_id,kind,title,body,related_type,related_id)
  select eu.user_id,'enterprise_share_review',
    case when v_status='approved' then '企業共享內容已核准' when v_status='needs_info' then '企業共享內容需要補充資料' else '企業共享內容未通過' end,
    coalesce(p_note,'請進入企業管理入口查看目前狀態。'),'enterprise_share',p_share_id
  from public.enterprise_users eu where eu.enterprise_id=v_share.enterprise_id;
end;
$$;
revoke all on function public.admin_review_enterprise_share(uuid,text,boolean,text) from public,anon;
grant execute on function public.admin_review_enterprise_share(uuid,text,boolean,text) to authenticated;
