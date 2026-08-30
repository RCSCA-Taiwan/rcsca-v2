# RCSCA V2 · 1% Cycle of Goodness

Official starter repository for the RCSCA V2 platform.

## Current status

This repository is the engineering starter for the approved RCSCA V2 concept. Existing HTML prototypes are preserved under `public/prototypes/`. They are reference implementations only and are not yet connected to production authentication, database, permissions, payment, SMS, or case-management systems.

## Planned stack

- Next.js + TypeScript
- Supabase / PostgreSQL
- Supabase Auth + RLS
- Vercel
- Cloudflare
- SMS provider to be selected later

## Security rules

- Never commit `.env`, service-role keys, recovery codes, identity numbers, financial exports, or PASS IT ON case data.
- Production ownership stays with RCSCA-Taiwan organization.
- High-risk changes must remain auditable.

## Next engineering milestone

1. Create Supabase organization and separate development / production projects.
2. Add database migrations for profiles, memberships, teams, activities, ledgers, enterprises, support cases, roles, and audit logs.
3. Add authentication and row-level security before connecting private member data.
