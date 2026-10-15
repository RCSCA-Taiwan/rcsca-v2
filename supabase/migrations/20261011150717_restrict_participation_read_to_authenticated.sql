-- Limit participation reads to authenticated users.
-- Preserve the existing ownership and admin checks.
begin;

alter policy "participation self read"
on public.activity_participations
to authenticated;

commit;
