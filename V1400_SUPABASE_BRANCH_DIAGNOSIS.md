# V1400 Supabase Branch Diagnosis

Date: 2026-09-03

## Evidence

- Staging project: `RCSCA V2 Staging` (`skznlreavgipfhyapzjr`)
- Project status: `ACTIVE_HEALTHY`
- PostgreSQL: 17.6.1.166, GA channel
- Organization plan: Free
- Current branches: `main` only
- Branch Action logs, last 24 hours: no runs
- Supabase MCP documentation: Branching is experimental and requires a paid plan.

## Conclusion

The earlier `INVALID_ARGUMENT` branch-creation responses occurred before any branch action or migration execution. They do not indicate a failure in any of the 65 canonical migration files. Retrying the same request on the current plan would not add evidence.

## Safe resolution implemented

The existing Staging E2E GitHub Actions workflow now runs both remaining gates on an Ubuntu runner with the required capabilities:

1. Playwright installs and runs Chromium.
2. Supabase CLI uses Docker to start a fresh local stack and replay all 65 canonical migrations from zero.

No Supabase paid-plan upgrade, preview branch, merge, Production access, or Production mutation was performed.
