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
  const owner = await user("enterprise"), admin = await user("reviewer"), member = await user("member");
  sql(`insert into public.memberships(user_id,membership_type,status) values('${member.id}','annual','active')
    on conflict(user_id) do update set membership_type='annual',status='active';`);
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
  const testEnv = { ...process.env, NEXT_PUBLIC_SUPABASE_URL: env.API_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publicKey, RCSCA_E2E_BASE_URL: "http://127.0.0.1:3301",
    RCSCA_E2E_EMAIL: member.email, RCSCA_E2E_PASSWORD: password };
  for (const script of ["verify:browser", "verify:auth-e2e"]) {
    await new Promise((resolve, reject) => {
      const child = spawn("npm", ["run", script], { env: testEnv, stdio: "inherit" });
      child.on("error", reject);
      child.on("exit", code => code === 0 ? resolve() : reject(new Error(`${script} failed in disposable stack (${code})`)));
    });
  }
  console.log("PASS: desktop/mobile formal-member sign-in/out, account read-error recovery, SSR cookie authorization and admin denial against disposable users");
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
  const membershipTeam = randomUUID(), membershipTeamName = `Membership source team ${randomUUID()}`;
  sql(`insert into public.teams(id,name,leader_user_id,is_active) values('${membershipTeam}','${membershipTeamName}','${owner.id}',true);
    insert into public.team_members(team_id,user_id,role) values('${membershipTeam}','${owner.id}','leader');`);
  const applicant = await user("membership-applicant"), membershipAdmin = await user("membership-admin");
  sql(`insert into public.admin_roles(user_id,role_key) values('${membershipAdmin.id}','admin');`);
  const membershipPage = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  const reviewPage = await (await browser.newContext()).newPage();
  diagnosticPages.push(membershipPage, reviewPage);
  await login(membershipPage, applicant, "/membership/apply");
  const applicantName = `Synthetic member ${randomUUID()}`;
  await membershipPage.getByLabel("姓名＊", {exact:true}).fill(applicantName);
  await membershipPage.getByLabel("身分證字號＊", {exact:true}).fill("A123456789");
  await membershipPage.getByLabel("聯絡電話＊", {exact:true}).fill("0900000000");
  await membershipPage.getByLabel("信箱＊", {exact:true}).fill(applicant.email);
  await membershipPage.getByLabel("通訊地址＊", {exact:true}).fill("Synthetic address");
  await expect(membershipPage.getByRole("heading",{name:"2027年年度會員",exact:true})).toBeVisible();
  await membershipPage.getByLabel("介紹人或所屬企業",{exact:true}).fill(company);
  await expect(membershipPage.getByLabel("介紹人小隊",{exact:true})).toHaveValue(membershipTeamName);
  await expect(membershipPage.getByLabel("介紹人小隊",{exact:true})).toHaveJSProperty("readOnly",true);
  await membershipPage.getByRole("checkbox", {name:/我同意核准後加入/}).check();
  await membershipPage.getByRole("checkbox", {name:/我同意協會/}).check();
  await membershipPage.getByRole("button", {name:"送出申請",exact:true}).click();
  await expect(membershipPage.getByText("待審核", {exact:true})).toBeVisible();
  if(sql(`select count(*) from public.memberships where user_id='${applicant.id}';`)!=="0") throw new Error("Pending application activated membership");
  await login(reviewPage, membershipAdmin, "/admin/members");
  const membershipCard = reviewPage.locator("article").filter({has:reviewPage.getByRole("heading", {name:applicantName,exact:true})});
  await expect(reviewPage.locator(".liveAccountLoading")).toHaveCount(0);
  await expect(reviewPage.getByText("目前帳號沒有會員管理權限，或資料讀取失敗。",{exact:true})).toHaveCount(0);
  await membershipCard.getByRole("button",{name:"檢視及審核"}).click();
  await reviewPage.getByRole("combobox",{name:"審核結果",exact:true}).selectOption("approved");
  await reviewPage.getByLabel("正式入會日期＊",{exact:true}).fill(new Date().toISOString().slice(0,10));
  await reviewPage.getByLabel("處理原因＊",{exact:true}).fill("Synthetic verified membership");
  await reviewPage.getByRole("checkbox",{name:/已核對/}).check();
  await reviewPage.getByRole("button",{name:"確認處理",exact:true}).click();
  await expect(membershipCard.getByText("已核准",{exact:true})).toBeVisible();
  await membershipPage.goto("http://127.0.0.1:3301/membership/directory");
  await expect(membershipPage.getByRole("heading",{name:applicantName,exact:true})).toBeVisible();
  await expect(membershipPage.getByText("一般會員",{exact:true})).toBeVisible();
  if((await membershipPage.locator(".membershipRoster").innerText()).includes(applicant.email)) throw new Error("Membership directory exposed contact information");
  if(sql(`select count(*) from public.team_members where user_id='${applicant.id}' and team_id='${membershipTeam}' and left_at is null;`)!=="1") throw new Error("Typed enterprise source did not join its resolved team");
  console.log("PASS: typed enterprise source auto-fills a read-only team, survives submission and approval, and joins the verified team");
  console.log("PASS: real mobile membership form → protected RPC/Vault → admin approval → activated membership and member-only directory; no contact leakage");
  sql(`insert into public.point_transactions(user_id,tx_type,points,source_type) values('${applicant.id}','adjust',42,'isolated_anniversary_browser');`);
  const verifiedWallet=JSON.parse(sql(`select private.member_points_wallet('${applicant.id}');`));
  await membershipPage.goto("http://127.0.0.1:3301/my-1percent");
  await expect(membershipPage.locator(".digitalIdentityCard .pointsAvailable strong")).toHaveText("42");
  await expect(membershipPage.locator(".digitalIdentityCard time")).toHaveAttribute("datetime",verifiedWallet.expires_on);
  await membershipPage.goto("http://127.0.0.1:3301/share-market");
  await expect(membershipPage.locator(".marketWallet>strong")).toHaveText("42");
  await expect(membershipPage.locator(".marketWallet time")).toHaveAttribute("datetime",verifiedWallet.expires_on);
  console.log("PASS: confirmed admission → real point wallet → matching mobile identity card and market balances/deadlines");
  const resetReason=`Synthetic full reset request ${randomUUID()}`;
  await membershipPage.goto("http://127.0.0.1:3301/account/data-requests");
  await membershipPage.getByLabel("申請項目").selectOption("reset");
  await membershipPage.getByLabel("申請原因或補充說明＊").fill(resetReason);
  await membershipPage.getByRole("button",{name:"繼續確認申請",exact:true}).click();
  const resetDialog=membershipPage.getByRole("dialog");
  await expect(resetDialog.getByRole("heading")).toContainText("第一次提醒");
  await resetDialog.getByRole("checkbox").check();
  await resetDialog.getByRole("button",{name:"繼續第二次確認"}).click();
  await expect(resetDialog.getByRole("heading")).toContainText("第二次確認");
  await resetDialog.getByRole("checkbox").check();
  await resetDialog.getByRole("button",{name:"確認送出審核申請"}).click();
  await expect(membershipPage.getByText("待審核",{exact:true})).toBeVisible();
  await reviewPage.goto("http://127.0.0.1:3301/admin/members/data-requests");
  const resetCard=reviewPage.locator("article").filter({hasText:resetReason});
  await resetCard.getByRole("textbox",{name:"處理說明（會員可查看）＊"}).fill("Synthetic approval only; no reset executed");
  await resetCard.getByRole("button",{name:"核准申請（尚未執行）",exact:true}).click();
  await expect(resetCard.getByText("已核准，待處理",{exact:true})).toBeVisible();
  await membershipPage.reload();
  await expect(membershipPage.getByText("已核准，待處理",{exact:true})).toBeVisible();
  if(JSON.parse(sql(`select private.member_points_wallet('${applicant.id}');`)).balance!==42) throw new Error("Data request approval unexpectedly reset points");
  console.log("PASS: real mobile double-confirmed full reset request → admin approval → member sees pending execution; balance remains unchanged");
  membershipPage.on('dialog',dialog=>dialog.accept());
  reviewPage.on('dialog',dialog=>dialog.accept());
  const serviceTitle=`Browser service ${randomUUID()}`,deliveryTitle=`Browser delivery ${randomUUID()}`;
  await reviewPage.goto("http://127.0.0.1:3301/admin/rewards");
  await reviewPage.getByLabel("履約方式",{exact:true}).selectOption("service");
  await reviewPage.getByLabel("負責夥伴的登入信箱",{exact:true}).fill(owner.email);
  await reviewPage.getByLabel("名稱",{exact:true}).fill(serviceTitle);
  await reviewPage.getByLabel("共享點",{exact:true}).fill("10");
  await reviewPage.getByLabel("總名額",{exact:true}).fill("3");
  await reviewPage.getByLabel("狀態",{exact:true}).selectOption("approved");
  await reviewPage.getByRole("button",{name:"建立共享回饋",exact:true}).click();
  await expect(reviewPage.getByRole("status").filter({hasText:"共享回饋目錄已更新。"})).toBeVisible();
  const serviceId=sql(`select id from public.reward_catalog where title='${serviceTitle}';`);
  const firstSlot=randomUUID(),alternateSlot=randomUUID();
  sql(`insert into private.reward_slots(id,reward_id,starts_at,ends_at,capacity) values('${firstSlot}','${serviceId}',now()+interval '3 days',now()+interval '3 days 1 hour',1),('${alternateSlot}','${serviceId}',now()+interval '4 days',now()+interval '4 days 1 hour',1);`);
  await membershipPage.goto("http://127.0.0.1:3301/share-market");
  const serviceCard=membershipPage.locator('.rewardCard').filter({has:membershipPage.getByRole('heading',{name:serviceTitle,exact:true})});
  await serviceCard.getByRole('button',{name:'查看兌換 →',exact:true}).click();
  let fulfillmentDialog=membershipPage.getByRole('dialog');
  await fulfillmentDialog.getByLabel('希望預約時段＊',{exact:true}).selectOption(firstSlot);
  await fulfillmentDialog.getByLabel('聯絡姓名＊',{exact:true}).fill('Synthetic booking member');
  await fulfillmentDialog.getByLabel('聯絡電話＊',{exact:true}).fill('0900000000');
  await fulfillmentDialog.getByRole('checkbox').check();
  await fulfillmentDialog.getByRole('button',{name:'送出兌換申請',exact:true}).click();
  await expect(fulfillmentDialog.getByRole('status')).toContainText('尚未扣點');
  await expect(membershipPage.locator('.marketWallet>strong')).toHaveText('32');
  await ownerPage.goto("http://127.0.0.1:3301/account/fulfillment");
  const managedService=ownerPage.locator('article').filter({has:ownerPage.getByRole('heading',{name:serviceTitle,exact:true})});
  await managedService.getByRole('button',{name:'提出替代時段',exact:true}).click();
  await managedService.getByLabel('替代時段',{exact:true}).selectOption(alternateSlot);
  await managedService.getByRole('button',{name:'送出替代時段',exact:true}).click();
  await expect(managedService.getByText('夥伴提出新時段，等待你確認',{exact:true})).toBeVisible();
  await membershipPage.goto("http://127.0.0.1:3301/account/redemptions");
  const memberService=membershipPage.locator('article').filter({has:membershipPage.getByRole('heading',{name:serviceTitle,exact:true})});
  await memberService.getByRole('button',{name:'接受替代時段並兌換',exact:true}).click();
  await expect(memberService.getByText('預約已確認',{exact:true})).toBeVisible();
  sql(`update private.reward_slots set starts_at=now()-interval '1 hour',ends_at=now()+interval '1 hour' where id='${alternateSlot}';`);
  await ownerPage.reload();
  await managedService.getByRole('button',{name:'記錄服務已提供',exact:true}).click();
  await membershipPage.reload();
  await memberService.getByRole('button',{name:'確認已收到商品／服務',exact:true}).click();
  await expect(memberService.getByText('已完成',{exact:true})).toBeVisible();
  await reviewPage.getByLabel("履約方式",{exact:true}).selectOption("delivery");
  await reviewPage.getByLabel("負責夥伴的登入信箱",{exact:true}).fill(owner.email);
  await reviewPage.getByLabel("名稱",{exact:true}).fill(deliveryTitle);
  await reviewPage.getByLabel("共享點",{exact:true}).fill("5");
  await reviewPage.getByLabel("總名額",{exact:true}).fill("3");
  await reviewPage.getByLabel("狀態",{exact:true}).selectOption("approved");
  await reviewPage.getByLabel("配送與運費說明",{exact:true}).fill('Synthetic free shipping terms');
  await reviewPage.getByRole("button",{name:"建立共享回饋",exact:true}).click();
  await expect(reviewPage.getByRole('heading',{name:deliveryTitle,exact:true})).toBeVisible();
  await membershipPage.goto("http://127.0.0.1:3301/share-market");
  const deliveryCard=membershipPage.locator('.rewardCard').filter({has:membershipPage.getByRole('heading',{name:deliveryTitle,exact:true})});
  await deliveryCard.getByRole('button',{name:'查看兌換 →',exact:true}).click();
  fulfillmentDialog=membershipPage.getByRole('dialog');
  await fulfillmentDialog.getByLabel('郵遞區號＊',{exact:true}).fill('100');
  await fulfillmentDialog.getByLabel('收件地址＊',{exact:true}).fill('Synthetic private browser address');
  await fulfillmentDialog.getByLabel('收件人姓名＊',{exact:true}).fill('Synthetic recipient');
  await fulfillmentDialog.getByLabel('聯絡電話＊',{exact:true}).fill('0900000000');
  await fulfillmentDialog.getByRole('checkbox').check();
  await fulfillmentDialog.getByRole('button',{name:'送出兌換申請',exact:true}).click();
  await expect(fulfillmentDialog.getByRole('status')).toContainText('尚未扣點');
  await ownerPage.reload();
  const managedDelivery=ownerPage.locator('article').filter({has:ownerPage.getByRole('heading',{name:deliveryTitle,exact:true})});
  await managedDelivery.getByRole('button',{name:'確認並扣點',exact:true}).click();
  await managedDelivery.getByLabel('物流名稱',{exact:true}).fill('Synthetic carrier');
  await managedDelivery.getByLabel('物流單號',{exact:true}).fill('TEST-ONLY-BROWSER');
  await managedDelivery.getByRole('button',{name:'記錄已出貨',exact:true}).click();
  await membershipPage.goto("http://127.0.0.1:3301/account/redemptions");
  const memberDelivery=membershipPage.locator('article').filter({has:membershipPage.getByRole('heading',{name:deliveryTitle,exact:true})});
  await expect(memberDelivery).toContainText('TEST-ONLY-BROWSER');
  await memberDelivery.getByRole('button',{name:'確認已收到商品／服務',exact:true}).click();
  await expect(memberDelivery.getByText('已完成',{exact:true})).toBeVisible();
  if(JSON.parse(sql(`select private.member_points_wallet('${applicant.id}');`)).balance!==27) throw new Error('Fulfillment balance mismatch');
  console.log('PASS: admin creates fulfillment catalogs → mobile booking holds points → provider proposes slot → member accepts → service completion; delivery address → provider approval → shipment tracking → member receipt; exactly 15 points spent');


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
