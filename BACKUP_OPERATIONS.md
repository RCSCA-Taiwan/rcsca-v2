# RCSCA Backup Operations

## Status semantics

The repository must not report Production data as protected merely because backup code or a synthetic restore test passes.

A Production backup is considered **verified offsite and restore-rehearsed** only after one Production job completes all of these steps:

1. Connect to the explicitly selected Production Supabase database over verified TLS.
2. Create the encrypted logical database snapshot and, when present, encrypted Storage object payloads.
3. Authenticate every encrypted payload and validate the manifest, SHA-256 values, sizes and `pg_restore` catalog.
4. Upload the completed encrypted directory to an independent S3-compatible destination.
5. Download that copy into a separate temporary directory.
6. Re-run authenticated bundle verification on the downloaded copy.
7. Start a disposable local Supabase stack and restore the Production-origin database archive into a separate clean database.
8. Verify required schemas, core application tables, Storage metadata inventory, foreign keys and RLS metadata; re-authenticate every encrypted Storage payload after the database restore.

A successful synthetic Docker restore drill proves archive mechanics only. It is not evidence that a real Production-origin bundle can restore. The real-bundle rehearsal is also not a write-back to hosted Production and must not be described as a hosted Production disaster restore.

## Scheduled workflow

`.github/workflows/backup-operations.yml` has two independent schedules:

- Daily 02:30 Asia/Taipei: Production encrypted backup + offsite copy + offsite re-download verification + isolated Production-origin database restore rehearsal.
- Sunday 03:00 Asia/Taipei: isolated synthetic restore-format drill.

`workflow_dispatch` runs both jobs for an explicit manual verification.

The Production job is fail-closed. If any required protected setting is absent, it exits non-zero and writes `Production backup NOT READY` to the GitHub Job Summary. No backup, offsite copy or real-bundle restore rehearsal is claimed in that state.

Sensitive backup material is never uploaded as a GitHub Actions artifact. Runner-local backup directories and restore material are removed in an `always()` cleanup step.

## Required GitHub Actions secrets

These values belong in GitHub Actions encrypted secrets and must never be committed, pasted into documentation, or exposed in build output.

| Secret | Purpose |
| --- | --- |
| `RCSCA_BACKUP_PGHOST` | Production direct/session-pooler host validated against the selected project |
| `RCSCA_BACKUP_PGUSER` | Production PostgreSQL user validated against the selected project |
| `RCSCA_BACKUP_PGPASSWORD` | Database password |
| `RCSCA_BACKUP_PROJECT_REF` | Explicit Production Supabase project reference |
| `RCSCA_BACKUP_KEY` | Independent 32-byte Base64 AES-256-GCM archive key |
| `RCSCA_BACKUP_STORAGE_KEY` | Server-side Storage read key; conditionally required when Storage contains objects |
| `RCSCA_BACKUP_S3_BUCKET` | Independent offsite bucket name |
| `RCSCA_BACKUP_S3_ENDPOINT` | Optional S3-compatible endpoint; blank for AWS S3 |
| `RCSCA_BACKUP_S3_ACCESS_KEY_ID` | Offsite storage access key |
| `RCSCA_BACKUP_S3_SECRET_ACCESS_KEY` | Offsite storage secret key |
| `RCSCA_BACKUP_S3_REGION` | S3-compatible region value |

The archive encryption key must be recoverable from a separate controlled location. Storing the only copy of that key in the same offsite bucket would make the backup operationally unrecoverable after account loss.

## Offsite storage requirements

The destination must be independent from the Production Supabase project. AWS S3, Cloudflare R2, Backblaze B2 or another S3-compatible object store is acceptable when access controls, retention and billing are owned by the association.

Recommended baseline before calling the process operational:

- Versioning or object-lock equivalent enabled where supported.
- Lifecycle retention explicitly configured and documented; do not rely on an undocumented provider default.
- Backup writer credentials limited to the dedicated backup prefix/bucket where possible.
- Restore operator access separated from the routine backup writer where the provider supports it.
- Billing/usage alerts enabled so backups do not silently stop because of quota or payment failure.

The workflow intentionally does not delete remote backups. Remote retention is a storage-governance decision and should be enforced by the destination lifecycle policy rather than ad-hoc CI deletion commands.

## Restore boundary

The weekly synthetic drill validates authenticated archive restore mechanics, row/data integrity, RLS definitions, foreign keys, identity sequence and Storage payload bytes using synthetic data.

The Production job now adds a stronger rehearsal: the actual offsite Production-origin database archive is restored into an isolated local Supabase PostgreSQL database after authenticated re-download. The rehearsal checks the restored database structure and Storage metadata inventory without connecting back to hosted Production.

This still does **not** perform either of the following:

- restore into the hosted Production Supabase project;
- rehydrate encrypted Storage objects through a hosted Supabase Storage API.

A full hosted disaster-recovery exercise would require a separately authorized non-Production Supabase target, explicit operator approval, provider-specific Auth/Storage restoration handling and a controlled cutover/runbook. The automated workflow therefore reports those hosted restore steps as not performed.

## Operational completion criteria

Backup/recovery can be marked operational at the repository/workflow layer only when all of the following have evidence:

- At least one Production run has completed its offsite upload, offsite re-download and isolated Production-origin database restore rehearsal.
- Independent retention/lifecycle policy is confirmed on the remote store.
- Encryption key recovery responsibility is documented outside the repository.
- The Production-origin restore rehearsal passed without writing to Production.

A separately authorized hosted non-Production Supabase restore remains an additional disaster-recovery maturity step rather than something CI should perform automatically.

Until the protected secrets, independent destination and at least one successful Production run exist, the website may be deployable and functionally complete while disaster recovery remains partially operational.
