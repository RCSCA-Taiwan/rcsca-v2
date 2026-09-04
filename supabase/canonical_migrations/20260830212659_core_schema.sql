-- Canonical export recovered read-only from Staging migration history.
-- Version: 20260830212659; name: core_schema

-- RCSCA V2 core schema — staging-first foundation
-- Financial amounts are deliberately excluded from XP / shared-value tables.

create extension if not exists pgcrypto;

create type public.membership_type as enum ('annual','lifetime','inactive','pending');
create type public.review_status as enum ('draft','submitted','under_review','needs_info','approved','matched','completed','rejected','cancelled');
create type public.verification_status as enum ('unverified','pending','verified','rejected');
create type public.privacy_scope as enum ('public_summary','member_only','restricted');
create type public.share_type as enum ('care','connection','benefit','job','professional','resource');
create type public.point_tx_type as enum ('earn','spend','expire','adjust');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  mobile text,
  email text,
  joined_platform_at timestamptz not null default now(),
  locale text not null default 'zh-TW',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.identity_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  verification_kind text not null,
  identity_token_hash text,
  status public.verification_status not null default 'pending',
  verified_at timestamptz,
  verified_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique(user_id, verification_kind)
);

create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  membership_type public.membership_type not null,
  member_since date,
  member_number text unique,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  leader_user_id uuid references public.profiles(id),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique(team_id,user_id)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  inviter_user_id uuid references public.profiles(id),
  invitee_user_id uuid references public.profiles(id),
  source_type text,
  source_note text,
  original_referrer_text text,
  created_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  category text not null default 'care',
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'draft',
  public_summary text,
  created_at timestamptz not null default now()
);

create table public.activity_participations (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  participation_type text not null,
  status public.verification_status not null default 'pending',
  source_channel text,
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique(activity_id,user_id,participation_type)
);

create table public.sharing_footprints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  footprint_type text not null,
  source_type text not null,
  source_id uuid,
  description text,
  created_at timestamptz not null default now()
);

create table public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tx_type public.point_tx_type not null,
  points integer not null check (points <> 0),
  source_type text not null,
  source_id uuid,
  description text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.xp_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  xp integer not null check (xp > 0),
  source_type text not null,
  source_id uuid,
  description text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.member_levels (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  level integer not null default 1 check (level between 1 and 5),
  lifetime_xp integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.enterprises (
  id uuid primary key default gen_random_uuid(),
  tax_id text unique not null,
  legal_name text not null,
  display_name text,
  industry text,
  region text,
  public_description text,
  status public.review_status not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.enterprise_users (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null references public.enterprises(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'manager',
  created_at timestamptz not null default now(),
  unique(enterprise_id,user_id)
);

create table public.enterprise_shares (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null references public.enterprises(id) on delete cascade,
  share_type public.share_type not null,
  title text not null,
  description text,
  status public.review_status not null default 'submitted',
  public_result boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.enterprise_badges (
  id uuid primary key default gen_random_uuid(),
  enterprise_id uuid not null references public.enterprises(id) on delete cascade,
  year integer not null,
  badge_label text not null default '1% Partner',
  issued_at timestamptz,
  expires_at timestamptz,
  status text not null default 'pending',
  unique(enterprise_id,year)
);

create table public.support_cases (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.profiles(id),
  title text not null,
  public_summary text,
  private_detail text,
  privacy public.privacy_scope not null default 'restricted',
  status public.review_status not null default 'submitted',
  assigned_to uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.case_needs (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.support_cases(id) on delete cascade,
  category text not null,
  description text not null,
  status public.review_status not null default 'submitted',
  created_at timestamptz not null default now()
);

create table public.network_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references public.profiles(id) on delete cascade,
  requester_enterprise_id uuid references public.enterprises(id),
  request_kind text not null,
  title text not null,
  public_summary text,
  private_detail text,
  privacy public.privacy_scope not null default 'member_only',
  status public.review_status not null default 'submitted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.admin_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_key text not null,
  created_at timestamptz not null default now(),
  unique(user_id,role_key)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_user_id uuid references public.profiles(id),
  actor_role text,
  action text not null,
  subject_type text not null,
  subject_id text,
  note text,
  created_at timestamptz not null default now()
);

create index idx_participations_user on public.activity_participations(user_id);
create index idx_footprints_user_created on public.sharing_footprints(user_id,created_at desc);
create index idx_points_user_created on public.point_transactions(user_id,created_at desc);
create index idx_xp_user_created on public.xp_transactions(user_id,created_at desc);
create index idx_enterprises_industry_region on public.enterprises(industry,region);
create index idx_support_cases_status on public.support_cases(status);
create index idx_network_requests_status on public.network_requests(status);
