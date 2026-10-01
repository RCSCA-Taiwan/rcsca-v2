# V1460/V1461 — One-time activity review and reward completion

## Fixed behavior

- Activity review locks the participation and accepts only `pending`. A second
  approval or reversal now fails before creating audit entries or footprints.
  Existing role checks and function ACLs are unchanged.
- Reward approval followed by completion collided with the unique related
  notification index. The existing notification now updates to the latest state
  and becomes unread again. Points, stock and status-transition logic is unchanged.

Both migrations are applied to Production and recorded in the canonical archive
(70 migrations). No existing participation or redemption data was rewritten.

## Verification

Production transaction-scoped tests passed for:

- Member review denial, initial activity approval, repeat approval/reversal denial
  and exactly one footprint.
- Duplicate redemption submission and member approval denial.
- Approval with exactly one spend transaction and one stock decrement.
- Completion and repeated-completion denial; one refreshed unread notification.
- Rejection and exhausted stock without point deductions.

All synthetic data, point adjustments and temporary admin roles were rolled back.
The E2E account retains zero admin roles. A read-only scan found zero existing
duplicate activity-footprint groups. Security advisor warning categories/counts
are unchanged from V1450.

Reproducible psql scenarios are in `supabase/tests/participation_review_once.sql`
and `supabase/tests/reward_review_lifecycle.sql`. Pass `ON_ERROR_STOP=1` and
`member_id=<dedicated, unprivileged test-profile UUID>`. Run only through a trusted
operator connection capable of setting authenticated roles. These tests roll back
and refuse an account with existing admin roles. They are not automatically run by
the migration-replay CI job.

## Remaining acceptance

These tests simulate database roles; browser review screens and mobile controls
still need end-to-end acceptance. Concurrent redemptions for different rewards,
enterprise review roles and settlement limits are not covered in this pass.
