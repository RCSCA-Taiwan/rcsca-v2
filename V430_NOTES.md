# V430 — Completion batch: persistent MY 1% + real Network directory

- MY 1% onboarding now persists share-mode preferences to Supabase; selections do not create XP/points.
- 1% Network join is now a real authenticated submission with approval gating.
- Public Network map and directory no longer use fabricated partner counts/names; they read approved public network_profiles.
- Empty categories remain visible intentionally as network gaps.
- Private contact details are not stored in public Network profile rows.
- Added migration 0028_v430_network_profiles_my1_preferences.sql with RLS.
- Member job board now reads approved enterprise job shares and submits interest as a private Network request.
- Team page now reads the authenticated member's real team/members instead of hard-coded names and counts.
- 1% 共享所 now has a persistent reward catalog/redemption data model; points/level/footprints are read from real account data.
