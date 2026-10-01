# V1450 — Activity administration repair and workflow verification

The Production activity creation/update RPC still referenced the removed
`public.is_admin()` helper. Authenticated calls failed with `undefined_function`
before reaching the intended role check. Migration `20261001075915` changes only
that reference to `private.is_admin()` and preserves the function's ACL and logic.

Production now has no public function definitions referencing `public.is_admin(`.
The canonical archive includes the recorded migration (68 total).

## Verification on 2026-10-01

Transaction-scoped SQL tests used the dedicated E2E member. All fixture data and
temporary role assignments were rolled back; the account has zero admin roles.

- Ordinary member receives `insufficient_privilege` from activity administration.
- An admin role can create and update an activity.
- Repeated registration returns one participation; pending registration cancels.
- Support submission is visible to its owner, while member review is denied.
- Case-manager review updates status, owner-visible events and notifications.
- Internal notes are hidden from the owner; another member cannot read the case
  or its events.

These are database/RPC tests with simulated authenticated roles, not completed
browser acceptance of the submission/review screens. They do not cover approval
idempotency, points/inventory settlement, all enterprise roles or mobile layouts.

The credentialed Auth CI verifier now also asserts activity administration is
denied to the E2E member, catching recurrence of the missing-helper failure.

Security advisors report the existing authenticated SECURITY DEFINER RPC warning
and disabled leaked-password protection; no new RLS or function-ACL changes were
introduced. Each public RPC still requires its own authorization review.

Vercel project inspection was blocked by connector argument validation, so live
deployment/domain verification was not completed in this pass.
