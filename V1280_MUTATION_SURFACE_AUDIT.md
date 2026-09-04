# V1280 Mutation Surface Audit

Date: 2026-09-02  
Environment: RCSCA V2 Staging

## Result

The application has no direct Supabase table mutation calls. Searches across `app`, `lib`, and `components` found zero uses of `.insert()`, `.update()`, `.upsert()`, or `.delete()`. Domain mutations use the reviewed RPC layer; account email and password changes use Supabase Auth.

## Staging hardening

- Revoked `INSERT`, `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`, and `TRIGGER` on all public tables from `anon` and `authenticated`.
- Revoked the same default privileges for future public tables.
- Preserved `SELECT` access under existing RLS policies.
- Preserved 52 authenticated `SECURITY DEFINER` RPC endpoints used by the frontend.

## Verification

| Check | Result |
| --- | ---: |
| Frontend direct table mutation calls | 0 |
| Public tables writable by `anon` | 0 |
| Public tables writable by `authenticated` | 0 |
| Authenticated reviewed RPC endpoints | 52 |
| Relation grant contract | 438 / `5a6177df49ffb283ff93c50048078f23` |

Production was not changed.
