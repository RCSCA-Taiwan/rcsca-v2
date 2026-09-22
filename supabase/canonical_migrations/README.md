# Canonical Staging Migration Archive

This directory contains the canonical migration statements recovered read-only
from the RCSCA V2 database histories:

- 65 statements from Staging on 2026-09-03.
- V1401 and V1420 from Production on 2026-09-22.

- Files are ordered by their original 14-digit migration version.
- The SQL was not executed during export.
- `manifest.json` records the remote byte length, MD5, and trailing-newline state.
- Run `npm run verify:canonical-migrations` from the application root to verify
  all local files against the captured manifest.
- Run `npm run verify:canonical-replay` on a machine with Docker to create a
  disposable local Supabase stack, replay all 67 migrations from zero,
  print the applied migration list, stop the stack, and remove its temporary
  files and volumes. The runner pins Supabase CLI 2.116.0.
- The legacy `supabase/migrations` directory is preserved unchanged. Do not
  mix both histories in one replay. Promote this archive to the active migration
  directory only as a controlled, separately verified migration-history change.

GitHub Actions runs the disposable empty-database replay for pull requests,
`main` pushes and manual dispatches.
