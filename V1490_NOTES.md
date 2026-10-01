# V1490 — isolated enterprise/admin browser acceptance

Canonical replay now launches a local Next.js server against its loopback Supabase API and creates temporary confirmed users with the local Auth Admin API. A desktop enterprise reviewer requests supplemental information, approves enterprise identity, and links the requester as manager. The requester uses a mobile viewport to submit a sharing item. The reviewer approves it without publication; the requester reloads and sees the approved item. SQL assertions verify manager linkage, approval, non-public state and one related notification.

Only generated disposable replay containers and loopback API URLs are accepted. Production credentials are not needed. The replay runner stops and removes the entire stack afterward. This is CI browser acceptance, not a production data mutation.
