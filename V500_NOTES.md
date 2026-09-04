# V500

- Added protected support-case event timeline with separate owner-visible replies and internal case notes.
- Added owner reply RPC and case-manager update RPC with notifications and audit logs.
- Added `/account/requests/support/[id]` so a user can follow and reply inside the exact support case.
- Added `/admin/cases` for case-manager processing instead of routing sensitive cases through generic operations.
- Notifications now deep-link to known related workflows instead of being dead-end messages.
- Admin queue routes protected support cases directly to the dedicated case-management workspace.
