# V1300 Notes

- Added rollback-only tests for nine admin/member workflow transitions.
- Fixed three RPCs that referenced the removed legacy notifications table.
- Verified zero remaining database function references to `public.notifications`.
- Refreshed the schema function fingerprint.
- Left no Auth users or fixture data in Staging.
- Production remains unchanged.
