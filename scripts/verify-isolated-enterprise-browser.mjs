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
const diagnosticPages = [];
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
  sql(`insert into public.admin_roles(user_id,role_key) values('${admin.id}','enterprise_reviewer'),('${admin.id}','outcome_reviewer');
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
  diagnosticPages.push(adminPage, ownerPage);
  const errors = [];
  for (const page of [adminPage, ownerPage]) {
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (response) => {
      if (response.url().startsWith(env.API_URL) && response.status() >= 400) {
        errors.push(`http: ${response.status()} ${new URL(response.url()).pathname}`);
      }
    });
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
  await share.getByPlaceholder("給企業的審核說明（選填）").fill("Please add delivery details");
  await share.getByRole("button", { name: "請補資料", exact: true }).click();
  await expect(adminPage.getByText("審核狀態已更新，企業端會收到通知。", { exact: true })).toBeVisible();
  await ownerPage.reload();
  const correction = ownerPage.locator(".elRow").filter({ hasText: shareTitle });
  await expect(correction.getByRole("button", { name: "補件並重新送審", exact: true })).toBeVisible();
  await correction.locator("textarea").fill("Complete delivery details after review");
  await correction.getByRole("button", { name: "補件並重新送審", exact: true }).click();
  await expect(correction.getByRole("button", { name: "取消申請", exact: true })).toBeVisible();
  await adminPage.reload();
  await expect(share.getByText("Complete delivery details after review", { exact: true })).toBeVisible();
  await share.getByRole("button", { name: "核准但不公開", exact: true }).click();
  await expect(adminPage.getByText("已完成企業共享審核。", { exact: true })).toBeVisible();
  await ownerPage.reload();
  const row = ownerPage.locator(".elRow").filter({ hasText: shareTitle });
  await expect(row.getByRole("button", { name: "申請修改", exact: true })).toBeVisible();
  const state = JSON.parse(sql(`select json_build_object('status',s.status,'public',s.public_result,'role',eu.role,'notifications',(select count(*) from public.user_notifications where related_type='enterprise_share' and related_id=s.id)) from public.enterprise_shares s join public.enterprise_users eu on eu.enterprise_id=s.enterprise_id and eu.user_id='${owner.id}' where s.title='${shareTitle}';`));
  if (state.status !== "approved" || state.public !== false || state.role !== "manager" || state.notifications !== 1 || errors.length) throw new Error(`Enterprise browser state mismatch: ${JSON.stringify(state)}; ${errors.join(";")}`);
  await ownerPage.goto("http://127.0.0.1:3301/1percent-partner/esg");
  await ownerPage.getByLabel("企業或品牌名稱", { exact: true }).fill(company);
  await ownerPage.getByLabel("聯絡人", { exact: true }).fill("Replay contact");
  await ownerPage.getByLabel("Email", { exact: true }).fill(owner.email);
  await ownerPage.getByLabel("合作目標", { exact: true }).fill("Verified community cooperation");
  await ownerPage.getByRole("button", { name: "建立正式合作案件 →", exact: true }).click();
  await expect(ownerPage.getByText(/已建立正式合作案件 ESG-/)).toBeVisible();
  await adminPage.goto("http://127.0.0.1:3301/admin/enterprise-cases");
  const serviceCase = adminPage.locator("article").filter({ has: adminPage.getByRole("heading", { name: company, exact: true }) });
  await serviceCase.getByRole("button", { name: "進入評估", exact: true }).click();
  await expect(serviceCase.getByText("評估中", { exact: true })).toBeVisible();
  await serviceCase.getByRole("button", { name: "完成", exact: true }).click();
  await expect(serviceCase.getByText("已完成", { exact: true })).toBeVisible();
  await adminPage.goto("http://127.0.0.1:3301/admin/outcomes");
  const queue = adminPage.locator("section.panel").filter({ has: adminPage.getByRole("heading", { name: "待整理成果", exact: true }) });
  await queue.getByRole("button", { name: "建立成果草稿", exact: true }).click();
  await expect(queue.getByRole("button", { name: "草稿已建立", exact: true })).toBeDisabled();
  await adminPage.reload();
  const assetTitle = `Browser ESG ${randomUUID()}`;
  const draft = adminPage.locator("article").filter({ has: adminPage.getByRole("heading", { name: "ESG 成果素材草稿", exact: true }) });
  await draft.getByLabel("成果標題", { exact: true }).fill(assetTitle);
  await draft.getByLabel("成果摘要", { exact: true }).fill("Verified community cooperation result");
  await draft.getByLabel("成果期間", { exact: true }).fill("2026");
  await draft.getByRole("button", { name: "完成企業素材", exact: true }).click();
  await expect(adminPage.getByText("ESG 素材已完成，企業端將收到通知。", { exact: true })).toBeVisible();
  await adminPage.reload();
  const asset = adminPage.locator("article").filter({ has: adminPage.getByRole("heading", { name: assetTitle, exact: true }) });
  await expect(asset.getByRole("button", { name: "確認可供報告使用", exact: true })).toBeDisabled();
  await asset.getByRole("button", { name: "編輯核實依據", exact: true }).click();
  await asset.getByLabel("核實依據", { exact: true }).fill("Verified completed case records");
  await asset.getByLabel("SDG 對應（逗號分隔）", { exact: true }).fill("SDG 1, SDG 10");
  await asset.getByRole("button", { name: "儲存核實依據", exact: true }).click();
  await expect(asset.getByRole("button", { name: "確認可供報告使用", exact: true })).toBeEnabled();
  await asset.getByRole("button", { name: "確認可供報告使用", exact: true }).click();
  await expect(asset.getByText("✓ 可正式交付", { exact: true })).toBeVisible();
  await asset.getByRole("button", { name: "暫緩交付", exact: true }).click();
  await expect(asset.getByText("尚未達正式交付標準", { exact: true })).toBeVisible();
  await asset.getByRole("button", { name: "確認可供報告使用", exact: true }).click();
  await expect(asset.getByText("✓ 可正式交付", { exact: true })).toBeVisible();
  // An intentionally inconsistent legacy-style flag must not bypass export quality.
  sql(`insert into public.enterprise_service_requests(enterprise_id,requester_user_id,company_name,contact_name,contact_email,status)
    select enterprise_id,'${owner.id}','Invalid export fixture','Replay','invalid@example.test','completed' from public.enterprise_users where user_id='${owner.id}';
    insert into public.enterprise_esg_assets(enterprise_id,title,asset_type,summary,source_type,source_id,status,report_ready)
    select enterprise_id,'Incomplete export fixture','impact_summary','Missing evidence must not export','enterprise_service_request',id,'approved',true from public.enterprise_service_requests where company_name='Invalid export fixture';`);
  await ownerPage.goto("http://127.0.0.1:3301/1percent-partner/impact");
  await expect(ownerPage.locator(".esgAssetPanel").getByRole("heading", { name: assetTitle, exact: true })).toBeVisible();
  const downloadPromise = ownerPage.waitForEvent("download");
  await ownerPage.getByRole("button", { name: "匯出可用成果資料", exact: true }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  let exported = "";
  for await (const chunk of stream) exported += chunk;
  const exportedRows = JSON.parse(exported);
  if (exportedRows.length !== 1 || exportedRows[0].title !== assetTitle || exportedRows[0].source_verified !== true || exportedRows[0].evidence_note !== "Verified completed case records") throw new Error("Browser ESG export mismatch");
  const outcome = JSON.parse(sql(`select json_build_object('queue',(select count(*) from public.outcome_review_queue q join public.enterprise_service_requests r on r.id=q.source_id where r.requester_user_id='${owner.id}'),'asset',(select count(*) from public.enterprise_esg_assets where title='${assetTitle}' and report_ready),'case_notifications',(select count(*) from public.user_notifications where recipient_user_id='${owner.id}' and kind='enterprise_case'),'report_notifications',(select count(*) from public.user_notifications where recipient_user_id='${owner.id}' and kind='esg_report'));`));
  if (JSON.stringify(outcome) !== JSON.stringify({queue:1,asset:1,case_notifications:1,report_notifications:1}) || errors.length) throw new Error(`Browser outcome state mismatch: ${JSON.stringify(outcome)}; ${errors.join(";")}`);
  console.log("PASS: real mobile case intake, reviewer evaluation/completion, outcome drafts, edited ESG approval/evidence, hold/release, owner JSON export, one case/report notification");
  console.log("PASS: real browser sign-in, enterprise needs-info→approval/manager link, mobile sharing submission/correction/resubmission, admin private approval, owner sees approved result and one notification");
} catch (error) {
  for (const page of diagnosticPages) {
    if (!page.isClosed()) {
      console.error(`Isolated browser failure at ${new URL(page.url()).pathname}: ${await page.locator("body").innerText().catch(()=>"Page unavailable")}`);
    }
  }
  throw error;
} finally {
  await browser?.close();
  server?.kill("SIGTERM");
  // The enclosing replay runner removes this entire disposable stack, including users.
}
