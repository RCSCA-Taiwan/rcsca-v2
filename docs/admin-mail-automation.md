# Review notification scheduling

The administrator receives notifications through the existing private outbox.
Automatic mode starts OFF and requires actual test-email receipt acknowledgement
in `/admin/queue#mail-outbox`. Every five-minute tick handles at most three
messages. Pause stops subsequent claims; an already claimed SMTP attempt may
complete. Delivery acceptance is distinct from mailbox receipt.

## Signed requests on Supabase Cron

Hosted pg_net grants are a platform constraint. Database roles can read queued
HTTP headers/body; this implementation does not try to change those grants or
put a reusable credential into the queue. See the official explanation:
https://supabase.com/docs/guides/troubleshooting/database-roles-can-read-request-headers-queued-by-pg_net-ad6357

The fixed cron command is `select private.dispatch_admin_mail_tick();`, with
schedule `*/5 * * * *`. A private helper signs a fixed POST path, timestamp,
random nonce and `run`/`verify` mode using HMAC-SHA256. The key remains in Vault
and a production-only Vercel Secret. pg_net receives only signed fields; it has
no long-lived bearer key, recipient, source information or message content.

The production HTTP route validates the signature/time and atomically consumes
the private nonce through an invoker RPC authenticated with its server-only key.
Each nonce expires in two minutes and is accepted once. A reader of a queued
request could race the intended HTTP request, but can only invoke that already
authorized tick once, cannot change its fields or create a new authorized tick,
and cannot recover the signing key. No arbitrary recipients/content are accepted.
Normal per-message/run leases and attempt limits remain authoritative.

Verification mode returns a fixed `verified` response without creating a mail
run or touching SMTP, even when automatic mode is enabled. While paused, normal
scheduled ticks update the scheduler heartbeat without queuing HTTP requests.

## Rollout

1. Pass signature unit, rollback SQL, concurrent replay HTTP and existing outbox
   concurrency/browser tests. Apply the additive migration to staging/production.
2. Deploy the exact tested source. Existing private hash/Vault/Vercel key can be
   reused without reading it out of either secret store.
3. While paused, call `private.queue_admin_mail_tick(true)` and inspect only the
   returned request ID and its fixed HTTP response. Require `verified` and zero
   processed messages. No real email is sent by this check.
4. Register the named five-minute cron `rcsca-admin-mail-dispatch`; set readiness
   only after the job exists. Check a scheduled paused tick and cron run status.
5. Leave automatic mode OFF for the administrator's one-time acknowledgement and
   activation. Existing manual delivery remains available.

Keep tokens/signatures out of application logs and PRs. Public RPCs are invoker
wrappers; protected work stays in private helpers with capability checks. No
service-role key or user impersonation is needed. Never use user_metadata for
authorization.

## Failures and rollback

Definitive failures use durable 1/5/15/60-minute delays, five attempts maximum.
Unknown delivery or expired attempt leases never automatically retry. Old source
revisions and reviewed/withdrawn applications are cancelled before another claim.
Attempt/run history remains intact. Pause before code rollback. Keep additive
schema; do not reset accepted/unknown rows or backfill historical notifications.
Only expired temporary tick markers older than seven days are pruned.
