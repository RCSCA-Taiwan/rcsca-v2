#!/usr/bin/env bash
set -euo pipefail
# Run only on a disposable local Supabase stack. Never use linked database commands.
command -v supabase >/dev/null || { echo "Supabase CLI required" >&2; exit 1; }
command -v docker >/dev/null || { echo "Docker required" >&2; exit 1; }
docker info >/dev/null
supabase start
supabase db reset --local --no-seed
supabase test db supabase/tests/group_buy_v2_security.test.sql --local

supabase test db supabase/tests/group_buy_v2_reservation.test.sql --local

supabase test db supabase/tests/group_buy_v2_payment.test.sql --local

supabase test db supabase/tests/group_buy_v2_refund.test.sql --local

supabase test db supabase/tests/group_buy_v2_settlement.test.sql --local
command -v psql >/dev/null
bash scripts/test-group-buy-v2-concurrency.sh
