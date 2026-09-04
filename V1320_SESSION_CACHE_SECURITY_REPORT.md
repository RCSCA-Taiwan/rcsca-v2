# V1320 Session Cache and Dependency Security Report

Date: 2026-09-03

## Scope

- Staging/local application only.
- Production was not changed.
- Supabase SSR session refresh, CDN cache safety, and production dependency audit.

## Changes

- Upgraded and pinned `@supabase/ssr` from 0.7.0 to 0.10.0.
- Pinned `@supabase/supabase-js` to the verified installed version 2.112.4.
- Applied every response header supplied by the SSR `setAll` callback alongside refreshed cookies.
- Preserved public-page caching when no auth cookie is written.
- Overrode vulnerable transitive PostCSS 8.4.31 with compatible PostCSS 8.5.26 without forcing a Next.js major upgrade.

## Verification

- `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities.
- `npm run verify`: passed.
- TypeScript and production compilation: passed.
- Static route generation: 69/69 passed.
- Middleware production build: passed.
- Anonymous `/account`: HTTP 307 to `/login?next=%2Faccount`, `Cache-Control: private, no-store`.
- Anonymous `/account?tab=security`: query preserved only inside the safe internal return path.
- Public `/`: HTTP 200 and remains cacheable.
- `/api/health`: HTTP 200 with `no-store, max-age=0`.

## Remaining Limits

- Signed-in browser E2E still requires a disposable Staging Auth account and browser-accessible preview URL.
- Canonical empty-database replay still requires a complete baseline and suitable linked tooling.

