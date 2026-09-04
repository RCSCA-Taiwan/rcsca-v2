# V560

- Added account security page for authenticated email/password maintenance through Supabase Auth.
- Added database-level enterprise role enforcement: manager/editor may mutate enterprise operational records; viewer remains read-only.
- Added guards for enterprise shares, enterprise ESG service requests, and enterprise-related approved-record change requests.
- Enterprise dashboard now reads the signed-in enterprise role and hides mutation controls for viewers.
- Viewer can still inspect enterprise progress/results without being able to submit, cancel, supplement, or change enterprise records.
