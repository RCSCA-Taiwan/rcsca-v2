-- Canonical export recovered read-only from Staging migration history.
-- Version: 20260831061350; name: enterprise_network_workflow

-- V150: enterprise self-service, Network responses, and admin workflow support.

create table if not exists public.network_match_responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.network_requests(id) on delete cascade,
  responder_user_id uuid not null references public.profiles(id) on delete cascade,
  responder_enterprise_id uuid references public.enterprises(id) on delete set null,
  message text not null check (char_length(message) between 2 and 2000),
  status public.review_status not null default 'submitted',
  contact_exchange_allowed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(request_id,responder_user_id)
);

create index if not exists idx_network_match_responses_request on public.network_match_responses(request_id,created_at desc);
create index if not exists idx_network_match_responses_responder on public.network_match_responses(responder_user_id,created_at desc);

alter table public.network_match_responses enable row level security;
grant select, insert, update on public.network_match_responses to authenticated;

drop policy if exists "match responses participants read" on public.network_match_responses;
create policy "match responses participants read" on public.network_match_responses
for select to authenticated
using (
  responder_user_id = (select auth.uid())
  or exists (
    select 1 from public.network_requests nr
    where nr.id = request_id and nr.requester_user_id = (select auth.uid())
  )
  or private.is_admin(null)
);

drop policy if exists "match responses create self" on public.network_match_responses;
create policy "match responses create self" on public.network_match_responses
for insert to authenticated
with check (
  responder_user_id = (select auth.uid())
  and exists (
    select 1 from public.network_requests nr
    where nr.id = request_id
      and nr.requester_user_id <> (select auth.uid())
      and nr.status in ('submitted','under_review','approved','matched')
  )
  and (
    responder_enterprise_id is null
    or private.is_enterprise_user(responder_enterprise_id)
  )
);

drop policy if exists "match responses responder update" on public.network_match_responses;
create policy "match responses responder update" on public.network_match_responses
for update to authenticated
using (responder_user_id = (select auth.uid()) or private.is_admin(null))
with check (responder_user_id = (select auth.uid()) or private.is_admin(null));

-- Signed-in users can create their own Network requests.
drop policy if exists "network requests self insert" on public.network_requests;
create policy "network requests self insert" on public.network_requests
for insert to authenticated
with check (
  requester_user_id = (select auth.uid())
  and (requester_enterprise_id is null or private.is_enterprise_user(requester_enterprise_id))
  and status = 'submitted'
);

-- Enterprise users can submit enterprise shares, but they enter review rather than self-approve.
drop policy if exists "enterprise shares assigned insert" on public.enterprise_shares;
create policy "enterprise shares assigned insert" on public.enterprise_shares
for insert to authenticated
with check (
  private.is_enterprise_user(enterprise_id)
  and status = 'submitted'
  and public_result = false
);

drop policy if exists "enterprise shares assigned update draft" on public.enterprise_shares;
create policy "enterprise shares assigned update draft" on public.enterprise_shares
for update to authenticated
using (private.is_enterprise_user(enterprise_id) and status in ('draft','submitted','needs_info'))
with check (private.is_enterprise_user(enterprise_id) and status in ('draft','submitted','needs_info'));

-- Enterprise-linked Network requests remain visible to enterprise users as well as the individual requester.
drop policy if exists "network requests owner read" on public.network_requests;
create policy "network requests owner read" on public.network_requests
for select to authenticated
using (
  requester_user_id = (select auth.uid())
  or (requester_enterprise_id is not null and private.is_enterprise_user(requester_enterprise_id))
  or private.is_admin(null)
);

-- Admin reviewers need a readable queue; verification itself remains behind the guarded RPC.
drop policy if exists "participation admin queue read" on public.activity_participations;
create policy "participation admin queue read" on public.activity_participations
for select to authenticated
using (user_id = (select auth.uid()) or private.is_admin(null));
