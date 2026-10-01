import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { chromium, expect } from "@playwright/test";

const [container, workdir] = process.argv.slice(2);
if (!container?.startsWith("supabase_db_rcsca-canonical-replay-") || !workdir?.includes("rcsca-canonical-replay-")) throw new Error("Disposable replay stack required");
const status = spawnSync("npx", ["-y", "supabase@2.116.0", "status", "--workdir", workdir, "-o", "json"], { encoding: "utf8" });
if (status.status !== 0) throw new Error("Unable to inspect disposable stack");
const env = JSON.parse(status.stdout);
if (!/^http:\/\/(127\.0\.0\.1|localhost):/.test(env.API_URL)) throw new Error("Loopback Supabase API required");
const publicKey = env.PUBLISHABLE_KEY || env.ANON_KEY;
if (!publicKey || !env.SERVICE_ROLE_KEY) throw new Error("Disposable stack API keys missing");
const auth = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const password = `Replay-${randomUUID()}!`;
const company = `Browser enterprise ${randomUUID()}`;
const shareTitle = `Browser sharing ${randomUUID()}`;
const users = [];
let server, browser;
function sql(query) {
  const r = spawnSync("docker", ["exec", "-i", container, "psql", "-X", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-At"], { input: query, encoding: "utf8", timeout: 15000 });
  if (r.status !== 0) throw new Error(r.stderr);
  return r.stdout.trim();
}
async function user(role) {
  const email = `${role}-${randomUUID()}@example.test`;
  const { data, error } = await auth.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  users.push(data.user.id);
  return { id: data.user.id, email };
}
async function login(page, person, next) {
  await page.goto(`http://127.0.0.1:3301/login?next=${encodeURIComponent(next)}`);
  await page.getByRole("button", { name: "Email＋密碼" }).click();
  await page.locator('input[type="email"]').fill(person.email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole("button", { name: "登入", exact: true }).click();
  await expect(page).toHaveURL(`http://127.0.0.1:3301${next}`, { timeout: 30000 });
}
try {
  const owner = await user("enterprise"), admin = await user("reviewer");
  sql(`insert into public.admin_roles(user_id,role_key) values('${admin.id}','enterprise_reviewer');
    insert into public.enterprise_applications(requester_user_id,company_name,tax_id,contact_name,contact_email)
    values('${owner.id}','${company}','${randomUUID()}','Replay contact','${owner.email}');`);
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--hostname", "127.0.0.1", "--port", "3301"], {
    env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: env.API_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publicKey, NEXT_TELEMETRY_DISABLED: "1" }, stdio: ["ignore", "pipe", "pipe"],
  });
  let serverLog = "";
  for (const stream of [server.stdout, server.stderr]) stream.on("data", (v) => { serverLog = (serverLog + v).slice(-4000); });
  const deadline = Date.now() + 60000;
  while (true) {
    try { if ((await fetch("http://127.0.0.1:3301/api/health")).ok) break; } catch {}
    if (Date.now() > deadline || server.exitCode !== null) throw new Error("Isolated Next.js server did not become ready");
    await new Promise((r) => setTimeout(r,500));
  }
  browser = await chromium.launch();
  const adminPage = await (await browser.newContext()).newPage();
  const ownerPage = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const errors = [];
  for (const page of [adminPage, ownerPage]) {
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("dialog", (dialog) => dialog.accept());
    page.setDefaultTimeout(30000);
  }
  await login(adminPage,admin,"/admin/partners");
  const application = adminPage.locator("article").filter({ has: adminPage.getByRole("heading", { name: company, exact: true }) });
  await application.getByPlaceholder("審核說明／需補資料").fill("Replay supplemental note");
  await application.getByRole("button", { name: "請補資料", exact: true }).click();
  await expect(adminPage.getByText("申請狀態已更新並通知申請人。", { exact: true })).toBeVisible();
  await application.getByRole("button", { name: "核准企業身份", exact: true }).click();
  await expect(adminPage.getByText("企業已核准，申請帳號已連結企業身份。", { exact: true })).toBeVisible();
  await login(ownerPage,owner,"/1percent-partner/dashboard");
  await ownerPage.getByLabel("內容名稱", { exact: true }).fill(shareTitle);
  await ownerPage.getByLabel("補充說明", { exact: true }).fill("Replay enterprise sharing details");
  await ownerPage.getByRole("button", { name: "送出審核", exact: true }).click();
  await expect(ownerPage.getByText("已送出給 RCSCA 審核；核准前不會公開。", { exact: true })).toBeVisible();
  await adminPage.reload();
  const share = adminPage.locator("article").filter({ has: adminPage.getByRole("heading", { name: shareTitle, exact: true }) });
  await share.getByRole("button", { name: "核准但不公開", exact: true }).click();
  await expect(adminPage.getByText("已完成企業共享審核。", { exact: true })).toBeVisible();
  await ownerPage.reload();
  const row = ownerPage.locator(".elRow").filter({ hasText: shareTitle });
  await expect(row.getByRole("button", { name: "申請修改", exact: true })).toBeVisible();
  const state = JSON.parse(sql(`select json_build_object('status',s.status,'public',s.public_result,'role',eu.role,'notifications',(select count(*) from public.user_notifications where related_type='enterprise_share' and related_id=s.id)) from public.enterprise_shares s join public.enterprise_users eu on eu.enterprise_id=s.enterprise_id and eu.user_id='${owner.id}' where s.title='${shareTitle}';`));
  if (state.status !== "approved" || state.public !== false || state.role !== "manager" || state.notifications !== 1 || errors.length) throw new Error(`Enterprise browser state mismatch: ${JSON.stringify(state)}; ${errors.join(";")}`);
  console.log("PASS: real browser sign-in, enterprise needs-info→approval/manager link, mobile sharing submission, admin private approval, owner sees approved result and one notification");
} finally {
  await browser?.close();
  server?.kill("SIGTERM");
  // The enclosing replay runner removes this entire disposable stack, including users.
}
