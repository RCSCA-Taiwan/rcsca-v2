# V1360 Preview HTTP Acceptance Report

Date: 2026-09-03

## Outcome

- Added a repeatable production-server Preview HTTP smoke test.
- Integrated the smoke test into the main `npm run verify` release gate after the production build.
- Home and login pages return meaningful rendered HTML with HTTP 200.
- Unauthenticated `/account` returns HTTP 307 to `/login?next=%2Faccount` and is not cacheable.
- `/api/health` returns HTTP 200, `status: ok`, and `configured: true` without caching.
- All four routes include the required anti-sniffing, anti-framing, and referrer-policy headers.

## Verification

- Preview HTTP smoke test: 4/4 routes passed.
- Canonical archive integrity: 65/65 passed.
- Staging Auth inventory: 0 users, including 0 email-confirmed users.
- No remote database changes were made. Production remains unchanged.

## Remaining browser gate

This runtime does not include Chromium or an agent-browser executable. JavaScript hydration, browser console, and authenticated UI interaction still require a browser-capable runner plus a disposable email-confirmed Staging account.
