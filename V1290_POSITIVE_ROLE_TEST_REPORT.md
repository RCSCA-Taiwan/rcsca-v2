# V1290 Positive Role Test Report

Date: 2026-09-02  
Environment: RCSCA V2 Staging

## Result

Seven authenticated member/admin success paths passed inside a rollback-only transaction:

1. Basic profile update
2. MY 1% preference save
3. Identity verification request
4. Protected support case submission
5. Enterprise application submission
6. ESG service request submission
7. Admin referral overview authorization

The test inserted a temporary `auth.users` identity, set authenticated JWT claims, exercised the real RPC functions, asserted the resulting rows, then rolled back. Verification confirmed zero test-user residue.

## Defect found and fixed

`request_identity_verification` could not resolve pgcrypto `digest()` because its fixed `search_path` excluded the `extensions` schema. Migration `0059_v1290_fix_identity_digest_resolution.sql` adds `extensions` to that function's search path. The full 7/7 suite passed after the fix.

## Remaining scope

Fixture-heavy admin review transitions and browser-level Auth/API integration remain to be exercised. Production was not changed.
