import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";

// Only the disposable Supabase container created by canonical replay is supported.
const container = process.argv[2];
if (!container?.startsWith("supabase_db_rcsca-canonical-replay-")) {
  throw new Error("Use only the disposable canonical-replay database container");
}
const member = randomUUID();
const rewardA = randomUUID(), rewardB = randomUUID();
const redemptionA = randomUUID(), redemptionB = randomUUID();
const args = ["exec", "-i", container, "psql", "-X", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At"];
function sql(query) {
  const r = spawnSync("docker", args, { input: query, encoding: "utf8", timeout: 15000 });
  if (r.error || r.status !== 0) throw r.error ?? new Error(r.stderr);
  return r.stdout.trim();
}
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(predicate, message) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await pause(100);
  }
  throw new Error(message);
}
function session(query) {
  const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
  const result = { child, stdout: "", stderr: "", code: undefined };
  child.stdout.on("data", (v) => { result.stdout += v; });
  child.stderr.on("data", (v) => { result.stderr += v; });
  child.on("error", (e) => { result.stderr += e.message; result.code = -1; });
  child.on("close", (code) => { result.code = code; });
  child.stdin.write(query);
  return result;
}
const claims = `select set_config('request.jwt.claims','{"sub":"${member}","role":"authenticated"}',true); set local role authenticated;`;
let first, second;
try {
  sql(`insert into auth.users(id,email,raw_user_meta_data) values('${member}','${member}@example.invalid','{}');
    insert into public.memberships(user_id,membership_type,status) values('${member}','annual','active')
    on conflict(user_id) do update set membership_type='annual',status='active';`);
  for (const file of ["participation_review_once.sql", "reward_review_lifecycle.sql", "redemption_balance.sql", "enterprise_review_lifecycle.sql", "enterprise_share_lifecycle.sql", "case_outcome_delivery.sql"]) {
    console.log(sql(fs.readFileSync(`supabase/tests/${file}`, "utf8").replaceAll(":'member_id'", `'${member}'`)));
  }
  sql(`insert into public.admin_roles(user_id,role_key) values('${member}','admin');
    insert into public.point_transactions(user_id,tx_type,points,source_type) values('${member}','adjust',100,'isolated_concurrency_test');
    insert into public.reward_catalog(id,category,title,point_cost,stock_total,stock_remaining,min_level,min_footprints,status)
    values('${rewardA}','daily','Concurrency A',70,2,2,1,0,'approved'),('${rewardB}','daily','Concurrency B',70,2,2,1,0,'approved');
    insert into public.reward_redemptions(id,reward_id,user_id,point_cost,status)
    values('${redemptionA}','${rewardA}','${member}',70,'submitted'),('${redemptionB}','${rewardB}','${member}',70,'submitted');`);
  first = session(`begin; set local application_name='rcsca_concurrency_first'; ${claims}
    select public.admin_review_reward_redemption('${redemptionA}','approved');
    select 'FIRST_APPROVED_HOLDING';\n`);
  await until(() => first.stdout.includes("FIRST_APPROVED_HOLDING"), "First approval did not reach its lock-held checkpoint");
  second = session(`begin; set local statement_timeout='15s'; set local application_name='rcsca_concurrency_second'; ${claims}
    select public.admin_review_reward_redemption('${redemptionB}','approved'); commit;\n`);
  second.child.stdin.end();
  await until(() => sql("select count(*) from pg_stat_activity where application_name='rcsca_concurrency_second' and wait_event_type='Lock';") === "1", "Second approval did not wait on a database lock");
  first.child.stdin.end("commit;\n");
  await until(() => first.code !== undefined && second.code !== undefined, "Concurrent approval sessions did not finish");
  if (first.code !== 0 || second.code === 0 || !second.stderr.includes("insufficient_points")) {
    throw new Error(`Unexpected concurrent results: ${first.code}, ${second.code}; ${first.stderr}; ${second.stderr}`);
  }
  const actual = sql(`select json_build_object(
    'balance',(select sum(points) from public.point_transactions where user_id='${member}'),
    'spends',(select count(*) from public.point_transactions where user_id='${member}' and tx_type='spend'),
    'first',(select status from public.reward_redemptions where id='${redemptionA}'),
    'second',(select status from public.reward_redemptions where id='${redemptionB}'),
    'stock_a',(select stock_remaining from public.reward_catalog where id='${rewardA}'),
    'stock_b',(select stock_remaining from public.reward_catalog where id='${rewardB}'));`);
  const expected = { balance: 30, spends: 1, first: "approved", second: "submitted", stock_a: 1, stock_b: 2 };
  if (JSON.stringify(JSON.parse(actual)) !== JSON.stringify(expected)) throw new Error(`Concurrent state mismatch: ${actual}`);
  console.log("PASS: two independent sessions overlapped; second waited, then rejected overspend after first committed; balance=30, one spend, second stock/status unchanged");
} finally {
  for (const s of [first, second]) {
    if (s && s.code === undefined) s.child.kill();
  }
  // End any lock-holder before deleting disposable fixtures.
  sql("select pg_terminate_backend(pid) from pg_stat_activity where application_name in ('rcsca_concurrency_first','rcsca_concurrency_second') and pid<>pg_backend_pid();");
  sql(`delete from public.audit_logs where actor_user_id='${member}'; delete from auth.users where id='${member}'; delete from public.reward_catalog where id in ('${rewardA}','${rewardB}');`);
}
