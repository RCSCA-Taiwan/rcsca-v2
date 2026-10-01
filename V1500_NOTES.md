# V1500 — Enterprise sharing correction and review

A sharing item reviewed as needs_info could not be approved after the enterprise resubmitted it: the second review inserted the same related notification and raised a unique violation. Reproduced on production inside a transaction; all test records and temporary roles were rolled back.

The review RPC now refreshes the existing notification, clears its read timestamp, requires enterprise_reviewer/admin (including super_admin), accepts only submitted/under_review records, and requires a note for needs_info. Approved content remains protected by the separate change-request workflow. Existing anonymous execution restrictions remain in place.

Production migration 20261001124613 was applied after rollback verification and then passed the same lifecycle test again. The canonical archive includes its exact history SQL. SQL coverage includes two correction rounds, notification refresh, member/case-manager denial, null decisions, blank notes, and repeated review denial. The isolated browser acceptance now covers mobile correction and resubmission before private approval. CI rebuilds the complete canonical database before running it.

Security advisor retains existing intentional authenticated SECURITY DEFINER notices and the existing leaked-password-protection notice; the changed RPC enforces server-side role and status checks. No persistent test data or test privileges are left on production.
