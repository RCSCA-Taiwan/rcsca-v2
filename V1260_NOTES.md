# V1260 Notes

- Applied 0057_v1260_reduce_rpc_attack_surface.sql.
- Reduced authenticated SECURITY DEFINER endpoints from 58 to 52.
- Verified all 52 frontend RPCs remain executable.
- Removed direct Data API access from four deprecated/unused functions and two internal helpers.
- Verified guarded RPCs can still invoke the internal helpers.
- Revoked automatic default EXECUTE grants for future public-schema functions.
- Production remains unchanged.
