-- Separate anonymous public reads from authenticated admin checks.
begin;

alter policy "activities public or admin read"
  on public.activities
  to authenticated;

create policy "activities anon public read"
  on public.activities
  for select
  to anon
  using (status in ('published', 'active', 'completed'));

commit;
