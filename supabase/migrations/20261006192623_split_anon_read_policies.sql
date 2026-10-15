-- Separate anonymous reads from authenticated helper checks.
-- Preserve the existing authenticated policy predicates.

alter policy "cycle stories public or admin read"
on public.cycle_stories to authenticated;

alter policy "enterprise shares public or assigned read"
on public.enterprise_shares to authenticated;

alter policy "enterprises public or assigned read"
on public.enterprises to authenticated;

drop policy if exists "cycle stories anon read" on public.cycle_stories;
create policy "cycle stories anon read"
on public.cycle_stories for select to anon
using (
  status = 'approved'::public.review_status
  and consent_confirmed = true
);

drop policy if exists "enterprise shares anon read" on public.enterprise_shares;
create policy "enterprise shares anon read"
on public.enterprise_shares for select to anon
using (
  status = 'approved'::public.review_status
  and public_result = true
);

drop policy if exists "enterprises anon read" on public.enterprises;
create policy "enterprises anon read"
on public.enterprises for select to anon
using (status = 'approved'::public.review_status);
