# Canonical Staging Migration Archive

This directory contains the 65 migration statements recovered read-only from
the RCSCA V2 Staging migration history on 2026-09-03.

- Files are ordered by their original 14-digit migration version.
- The SQL was not executed during export.
- `manifest.json` records the remote byte length, MD5, and trailing-newline state.
- Run `npm run verify:canonical-migrations` from the application root to verify
  all local files against the captured manifest.
- Run `npm run verify:canonical-replay` on a machine with Docker to create a
  disposable local Supabase stack, replay all 65 migrations from zero twice,
  print the applied migration list, stop the stack, and remove its temporary
  files and volumes. The runner pins Supabase CLI 2.116.0.
- The legacy `supabase/migrations` directory is preserved unchanged. Do not
  mix both histories in one replay. Promote this archive to the active migration
  directory only as a controlled, separately verified migration-history change.

This archive closes the missing-SQL source gap. A disposable empty database is
still required to prove a full replay from zero.
