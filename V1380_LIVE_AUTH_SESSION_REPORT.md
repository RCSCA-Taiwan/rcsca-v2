# V1380 Live Auth Session Report

Date: 2026-09-03

## Outcome

- Created one disposable, email-confirmed Auth identity in Supabase Staging only.
- Verified that the Auth user, email identity, and triggered Profile row all existed before testing.
- Exercised the real password-token path and received HTTP 200.
- Exercised server-verified `/user` twice and received HTTP 200 both times, including the SSR account verification path.
- Observed no remaining test Session or refresh token after the sign-out portion.
- Deleted the disposable identity and verified zero residue across Auth users, sessions, refresh tokens, identities, and Profiles.

## Diagnostic correction

The first SQL fixture omitted the non-null-compatible empty value expected by GoTrue for `email_change`. Auth logs identified the exact scan failure. The fixture was removed, recreated with the required Auth defaults, and the password-token and user-verification paths then returned HTTP 200.

## Final residue check

| Resource | Remaining rows |
| --- | ---: |
| `auth.users` | 0 |
| Test sessions | 0 |
| Test refresh tokens | 0 |
| Test identities | 0 |
| Test Profiles | 0 |

Production was not accessed or changed.

## Remaining execution gates

- Execute the prepared Playwright suite in a Chromium-capable runner for rendered browser interaction evidence.
- Execute the canonical 65-migration replay in a Docker-capable runner.
