# V1290 Notes

- Added rollback-only authenticated member/admin positive-path smoke tests.
- Passed 7/7 profile, MY 1%, identity, support, enterprise, ESG intake, and admin authorization paths.
- Found and fixed the broken pgcrypto `digest()` resolution in identity verification.
- Refreshed the schema function fingerprint.
- Left no test users or fixture data in Staging.
- Production remains unchanged.
