# V1370 Browser E2E Readiness Report

Date: 2026-09-03

## User story

A visitor opens the RCSCA site, hydrates the login UI, signs in through Supabase Auth, reaches the protected account page, then signs out and loses protected-route access.

## Implemented coverage

- Public home and login rendering, Hydration, Next.js overlay absence, console errors, and page errors.
- Password-mode interaction and hydrated form controls.
- Signed-out protected-route redirect with preserved destination.
- Credential-gated Staging password sign-in, protected account rendering, safe sign-out, and post-sign-out redirect.
- Single-worker execution to avoid test-account session races.
- Failure-only trace, screenshot, and video retention.
- Manual GitHub Actions workflow with Node 22, pinned dependencies, Chromium installation, full release gate, and browser tests.

## Verification in this environment

- Playwright test discovery: passed.
- Playwright package pinned at 1.62.1 and lockfile updated.
- Chromium download timed out twice due this runtime's network path; retries were stopped.
- Preview HTTP test remains 4/4 and canonical archive remains 65/65.
- No Staging or Production data was changed.

## Remaining execution gate

Run the manual `Staging E2E` workflow after providing its four repository secrets. Staging currently has zero Auth users, so the credential-gated test requires a disposable, email-confirmed Staging account.
