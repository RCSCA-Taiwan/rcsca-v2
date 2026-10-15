# V1530: security, replay parity, and outcomes

Based on main commit `9c9ee5eb1915975b07022b597acde67f2572c90c` (V1520).

- Include the 14 post-archive migrations in disposable replay: 74 canonical migrations plus 14 follow-ups, total 88. Keep existing SQL workflow and isolated enterprise browser verification. The older standalone live-network migration is superseded by the production-history migration already in the canonical archive.
- Record the SQL already applied and verified remotely on 2026-10-15, including null-owner authorization fixes, private-helper references, reviewer roles, audit actors and guarded story draft saves. Adding these files does not run migrations against production.
- Bring back the outcome source labels, immediate draft refresh, optimistic story draft editing, and consent-gated real public stories verified in the earlier local work. Preserve V1520 ESG title/summary/period editing and evidence editing.
- Require explicit read errors and retry on the public cases page. Draft saves preserve input on failure and reject overwriting a concurrently changed revision.
- Pin Next.js 15.5.28 and React / React DOM 19.2.8; lock patched sharp and source-map-js dependencies.
- Extend the participation regression scenario to reject approval before activity completion, then verify a completed participation only once.

The earlier V1413 ZIP was based on the user-supplied V1410 source. This branch supersedes it for deployment and preserves the later repository changes.

Remote database work already completed: staging atomic replay of 88 migrations; public/private function contents and execution configuration (75 signatures) and public RLS policies compared equal across staging and production. The production leaked-password-protection setting remains disabled. Authenticated SECURITY DEFINER advisory notices still require interpreting each function's internal role checks.

Local verification and remote CI/deployment results are recorded in the pull request. Do not infer a production release merely from a successful local build or preview.
