# V1470 / V1471 — balance serialization and enterprise review
- Reward approval takes a member profile NO KEY UPDATE lock before inventory locking and balance calculation. Different rewards for the same member share the lock; foreign-key key-share checks remain compatible.
- Enterprise reviews require enterprise_reviewer, admin or super_admin. case_manager is rejected.
- Enterprise needs_info → approved refreshes the existing related notification and clears read_at.
- Production rollback tests pass for two rewards competing for a 100-point balance, role restrictions, required supplement note, manager linking, notification refresh and repeated approval denial.
- Cross-connection contention was attempted through the connector, but the lock-holder was not observed active before the contender ran. This does not establish real simultaneous-request coverage. Verify with two independent PostgreSQL sessions before claiming a committed concurrency stress test.
- All test fixtures, temporary roles and ledger changes roll back. Browser enterprise/admin acceptance remains outstanding.
