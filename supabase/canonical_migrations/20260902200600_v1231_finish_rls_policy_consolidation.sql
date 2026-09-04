-- Canonical export recovered read-only from Staging migration history.
-- Version: 20260902200600; name: v1231_finish_rls_policy_consolidation

-- V1231: finish consolidation of permissive SELECT policies.
-- Each replacement is the logical OR of the previous policies.

drop policy if exists "activities admin read" on public.activities;
drop policy if exists "activities public read" on public.activities;
create policy "activities public or admin read"
  on public.activities for select to public
  using (
    status in ('published','active','completed')
    or ((select auth.uid()) is not null and (select private.is_admin(null)))
  );

-- These two policies had identical predicates; PUBLIC already includes
-- authenticated sessions.
drop policy if exists "participation admin queue read"
  on public.activity_participations;

drop policy if exists "cycle stories admin manage" on public.cycle_stories;
drop policy if exists "cycle stories public approved" on public.cycle_stories;
create policy "cycle stories public or admin read"
  on public.cycle_stories for select to public
  using (
    (status = 'approved'::public.review_status and consent_confirmed = true)
    or ((select auth.uid()) is not null and (select private.is_admin(null)))
  );
create policy "cycle stories admin insert"
  on public.cycle_stories for insert to authenticated
  with check ((select private.is_admin(null)));
create policy "cycle stories admin update"
  on public.cycle_stories for update to authenticated
  using ((select private.is_admin(null)))
  with check ((select private.is_admin(null)));
create policy "cycle stories admin delete"
  on public.cycle_stories for delete to authenticated
  using ((select private.is_admin(null)));

drop policy if exists "enterprise badges assigned read" on public.enterprise_badges;
drop policy if exists "enterprise badges public issued read" on public.enterprise_badges;
create policy "enterprise badges public or assigned read"
  on public.enterprise_badges for select to public
  using (
    status = 'issued'
    or (
      (select auth.uid()) is not null
      and (
        private.is_enterprise_user(enterprise_id)
        or (select private.is_admin(null))
      )
    )
  );

drop policy if exists "esg assets admin manage" on public.enterprise_esg_assets;
drop policy if exists "esg assets enterprise read" on public.enterprise_esg_assets;
create policy "esg assets enterprise or admin read"
  on public.enterprise_esg_assets for select to authenticated
  using (
    private.is_enterprise_user(enterprise_id)
    or (select private.is_admin(null))
  );
create policy "esg assets admin insert"
  on public.enterprise_esg_assets for insert to authenticated
  with check ((select private.is_admin(null)));
create policy "esg assets admin update"
  on public.enterprise_esg_assets for update to authenticated
  using ((select private.is_admin(null)))
  with check ((select private.is_admin(null)));
create policy "esg assets admin delete"
  on public.enterprise_esg_assets for delete to authenticated
  using ((select private.is_admin(null)));

drop policy if exists "enterprises approved public read" on public.enterprises;
drop policy if exists "enterprises assigned read" on public.enterprises;
create policy "enterprises public or assigned read"
  on public.enterprises for select to public
  using (
    status = 'approved'::public.review_status
    or (
      (select auth.uid()) is not null
      and (
        private.is_enterprise_user(id)
        or (select private.is_admin(null))
      )
    )
  );
