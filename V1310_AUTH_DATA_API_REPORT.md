# V1310 Auth and Data API Integration Report

Date: 2026-09-03  
Environment: local application + RCSCA V2 Staging

## Implemented

- Added server-side Supabase session refresh and validation middleware.
- Protected account, admin, MY 1%, team, private enterprise, Network matching, and member-request routes.
- Added `Cache-Control: private, no-store` to protected responses and redirects.
- Preserved the intended internal destination through password and email-link sign-in.
- Rejected protocol-relative, backslash, absolute, and malformed post-login destinations.

## HTTP verification

| Route | Anonymous result |
| --- | --- |
| `/` | 200 |
| `/login` | 200 |
| `/account` | 307 to `/login?next=/account` |
| `/admin` | 307 to `/login?next=/admin` |
| `/my-1percent` | 307 to `/login?next=/my-1percent` |
| `/1percent-partner/dashboard` | 307 to its login return path |
| `/api/health` | 200, no-store |

## Staging Data API verification

| Check | Result |
| --- | --- |
| Public impact summary | HTTP 200, one aggregate row |
| Anonymous profile enumeration | HTTP 200, zero rows |
| Anonymous direct profile write | HTTP 401 |
| Anonymous privileged RPC | HTTP 401 |

## Limitation

The cloud browser could not reach the workspace loopback address, so visual browser automation was unavailable. The same running application was verified through local HTTP requests, production build, and the live Staging Data API. A signed-in browser session still requires a real disposable Auth account or a deployable preview URL.

Production was not changed.
