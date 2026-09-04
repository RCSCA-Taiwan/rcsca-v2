# V1280 Notes

- Audited the complete frontend mutation surface.
- Confirmed all domain writes use the reviewed RPC boundary.
- Removed unused direct public-table DML grants from anonymous and authenticated clients in Staging.
- Hardened default privileges so future tables require explicit direct-write opt-in.
- Refreshed the schema contract relation-grant fingerprint.
- Production remains unchanged.
