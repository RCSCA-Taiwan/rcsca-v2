# V1510 — Case completion to verified ESG delivery

Reproduced three failures in rollback transactions: subsequent case updates conflicted with the existing case notification, completed cases did not reach the outcome queue, and ESG delivery hold/release conflicted with an existing report notification.

The case update RPC now refreshes its notification and queues completed outcomes once. Repeated completion preserves the queue's review state. ESG delivery transitions refresh a single report notification. A new guarded outcome-reviewer RPC stores evidence/SDG changes and clears report readiness when evidence changes, requiring re-review. Anonymous execution is revoked. The internal queue function remains unavailable as a direct authenticated RPC.

The workbench now allows entering evidence and SDG tags, and draft approval allows editing title/summary/period. ESG JSON export uses the database delivery-readiness view, including approval, quality and verified source checks, instead of trusting report_ready alone.

Production migration 20261001133632 passed rollback lifecycle verification before and after application. Coverage includes role denial, once-only outcome queue/drafts, unpublished story drafts, evidence quality gate, hold/release/repeated release, notification refresh, and evidence edits clearing readiness. Canonical history includes the exact applied SQL.

Isolated browser acceptance extends the real mobile case intake through reviewer evaluation/completion, draft creation, edited ESG approval, evidence entry, hold/release and enterprise JSON download. An intentionally inconsistent legacy-style test flag must not bypass export quality. All browser data lives in the disposable stack. Production rollback test data and temporary privileges are not retained.
