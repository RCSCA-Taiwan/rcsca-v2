#!/usr/bin/env bash
set -euo pipefail
# Fixed loopback endpoint of disposable default Supabase stack; never accept remote URL.
export PGHOST=127.0.0.1 PGPORT=54322 PGUSER=postgres PGDATABASE=postgres PGPASSWORD=postgres
unset PGSERVICE PGSERVICEFILE PGOPTIONS
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
psql -X -v ON_ERROR_STOP=1 <<'SQL'
insert into auth.users(id) values ('f1000000-0000-4000-8000-000000000010'),('f1000000-0000-4000-8000-000000000011');
insert into public.group_buy_proposals_v2(id,proposer_user_id,title,retail_price,group_price,quantity_limit,fulfillment_terms,return_terms,status)
values ('f2000000-0000-4000-8000-000000000010','f1000000-0000-4000-8000-000000000010','Concurrency fixture',100,80,50,'fixture','fixture','open');
SQL
reserve() {
 psql -X -v ON_ERROR_STOP=1 -c "select public.group_buy_v2_reserve('f2000000-0000-4000-8000-000000000010','f1000000-0000-4000-8000-0000000000$1','f3000000-0000-4000-8000-0000000000$1',30,0,now()+interval '1 hour');"
}
reserve 10 >"$tmp/a" 2>&1 & a=$!
reserve 11 >"$tmp/b" 2>&1 & b=$!
ra=0; rb=0
wait "$a" || ra=$?
wait "$b" || rb=$?
cat "$tmp/a" "$tmp/b"
if ! { [[ $ra == 0 && $rb != 0 ]] || [[ $rb == 0 && $ra != 0 ]]; }; then exit 1; fi
grep -q 'Insufficient stock' "$tmp/a" "$tmp/b"
result=$(psql -X -At -v ON_ERROR_STOP=1 -c "select count(*)||':'||sum(quantity) from public.group_buy_v2_orders where proposal_id='f2000000-0000-4000-8000-000000000010' and status='reserved'")
[[ "$result" == '1:30' ]]
echo 'Concurrent capacity regression passed'
# Fixtures remain only in the disposable stack, removed by CI teardown.
