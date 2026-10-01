# V1480 — reproducible workflow and concurrency verification

Canonical replay now runs activity, reward and enterprise rollback scenarios on its disposable database. A separate concurrency scenario uses two independent PostgreSQL sessions: the first approval holds its transaction open, the second must be observed waiting on a database lock, then the first commits. The second must reject with insufficient_points and leave balance 30, one spend, inventory 1/2 and statuses approved/submitted.

The runner accepts only the generated canonical-replay container. It requires no production credentials and creates no production users or ledger entries. Test fixtures are removed before the disposable stack is stopped. CI execution is the source of verification; a syntax check alone is insufficient.

This covers database workflows. Browser acceptance with enterprise/admin identities and mobile form interactions remains separate.

Mobile coverage also runs real-member sign-in/sign-out, password-form interaction and enterprise navigation. The entrance animation now disables its button until ready and while opening: previously a click in the first 1.45 seconds was silently ignored while the button appeared actionable. Navigation testing waits for the entrance to close before using the menu.
