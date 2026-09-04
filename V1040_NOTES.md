# V1040 — Support case and identity localization cleanup

- Localized the member support-case hero, permissions boundary, status timeline, replies, empty states, errors, and locale-aware dates in all four languages.
- Corrected Japanese identity terminology that still contained Chinese-only wording.
- Replaced raw identity-verification backend error exposure with safe localized messages.
- Preserved user-only case access, identity rules, and existing Supabase behavior; no schema, RPC, or RLS changes.
