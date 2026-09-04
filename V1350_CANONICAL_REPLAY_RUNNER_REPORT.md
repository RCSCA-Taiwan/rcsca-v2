# V1350 Canonical Replay Runner Report

Date: 2026-09-03

## Outcome

- Added a self-cleaning empty-database replay runner for the 65 canonical migrations.
- The runner verifies archive hashes before execution.
- It creates a temporary Supabase project, removes the archive-only headers, starts the local stack, performs a clean `db reset`, lists applied migrations, stops the stack, and deletes temporary files and volumes.
- Supabase CLI is pinned to 2.116.0 so CI and developer machines execute the same workflow.

## Verification in this environment

- Runner JavaScript syntax: passed.
- Canonical archive integrity: 65/65 passed.
- Docker preflight: correctly blocked because this execution environment has no Docker-compatible runtime.
- No remote database was changed. Production remains unchanged.

## Remaining execution gate

Run `npm run verify:canonical-replay` once on a machine or CI runner with Docker. A successful result prints `Canonical empty-database replay passed: 65/65`.
