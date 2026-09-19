# V1410 Notes

- Replaced the public-facing ESG intake mock with the existing authenticated Supabase submission workflow.
- Replaced mock enterprise request cards with the signed-in user's real service requests and event timeline.
- Added explicit loading, signed-out, read-error, and connection-error states so the interface no longer reports fake success or fake cases.
- Preserved the controlled RPC boundary for case creation and enterprise replies.
