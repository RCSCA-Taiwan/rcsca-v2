-- Draft additive constraint; no production deployment.
alter table public.group_buy_proposals_v2 add column weekly_slot smallint
 check(weekly_slot between 1 and 3);
-- NOT VALID preserves legacy rows while enforcing new or updated rows.
alter table public.group_buy_proposals_v2 add constraint group_buy_v2_scheduled_slot_required
 check(status not in ('scheduled','open','closed') or
 (scheduled_week is not null and extract(isodow from scheduled_week)=1 and weekly_slot is not null)) not valid;
create unique index group_buy_v2_weekly_slot_unique
 on public.group_buy_proposals_v2(scheduled_week,weekly_slot)
 where status in ('scheduled','open','closed');
-- Slots are shared by enterprise and individual proposers.
-- Scheduling RPC must allocate a slot and verify membership, fee snapshot and reward contributions.
-- Existing unassigned campaigns must be reconciled before validating the constraint.
