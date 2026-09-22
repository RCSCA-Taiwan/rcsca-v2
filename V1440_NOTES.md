# V1440 — Formal-member E2E readiness

## Goal

Verify a real, least-privilege member path without creating a privileged test
administrator or exposing a Supabase server secret to GitHub Actions.

## One-time account bootstrap

Run this only from a trusted operator machine. The script is idempotent and
refuses to modify an existing account unless its Auth app metadata already has
`purpose: e2e`.

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SECRET_KEY` or legacy `SUPABASE_SERVICE_ROLE_KEY`
- `RCSCA_E2E_EMAIL`
- `RCSCA_E2E_PASSWORD` (at least 12 characters)
- `RCSCA_E2E_BOOTSTRAP_CONFIRM=CREATE_FORMAL_MEMBER_TEST_ACCOUNT`

Then run:

```bash
npm run bootstrap:e2e-member
```

The account receives an active annual membership and no admin role. The script
aborts if an admin role is present.

## CI activation

Store only these values as GitHub Actions secrets:

- `RCSCA_E2E_EMAIL`
- `RCSCA_E2E_PASSWORD`

Then set repository variable `RCSCA_E2E_AUTH_ENABLED=true`. The Supabase secret
key is not required by CI and must not be stored for this workflow.

When enabled, CI verifies:

- password sign-in and verified Auth identity;
- access to the user's own profile and active formal membership;
- absence of any admin role;
- rejection by an admin-only RPC;
- the browser account page displays `RCSCA MEMBER` and signs out safely.
