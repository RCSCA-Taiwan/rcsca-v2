# RCSCA V2 — Current Operational Baseline

> 最新營運基準：2026-10-25（Asia/Taipei）。如本檔與 `PROJECT_STATUS.md` 舊段落衝突，以本檔、最新 Production 與 CI 紀錄為準；`PROJECT_STATUS.md` 僅保留歷史演進用途。

## Production

- GitHub `main` 與 Vercel 最新 Production deployment 為即時版本來源；本檔不再硬寫單一 commit SHA，避免正常維護後基準文字立即過期。
- Vercel Production：READY；正式站目前採 fail-closed Auth 狀態。
- 正式網址目前為 `https://rcsca-v2.vercel.app`；尚未綁定 RCSCA 自有網域。
- `NEXT_PUBLIC_SITE_URL=https://rcsca-v2.vercel.app` 已配置於 Production，未來接自有網域時需同步更新環境變數、Auth redirect/callback 與網域綁定後重新完成端到端驗收。
- Production Supabase：`zoogppmgajbiridffohm`，ACTIVE_HEALTHY。
- `NEXT_PUBLIC_REGISTRATION_OPEN=false`；`NEXT_PUBLIC_AUTH_EMAIL_ENABLED=false`。2026/10/25 真實註冊測試確認 Supabase Auth SMTP 回傳 Gmail `535 BadCredentials` 後主動關閉，避免使用者再撞到失敗流程。
- 正式 `/register` 已實測顯示「線上註冊暫未開放」；`/login` 已停用 Email magic-link、保留既有帳號密碼登入；`/auth/recover` 已停用寄信表單。
- 正式 `/api/health` 已回 200、`status=ok`、`configured=true`；此 health check 不代表外部 SMTP 寄送成功。

## 公開／受保護入口

已實際核對：
- `/`、`/register`、`/care-actions`、`/care-actions/request`、`/1percent-partner`、`/1percent-partner/esg`、`/governance` 可正常載入。
- `/my-1percent`、`/membership/apply`、`/admin/operations` 未登入時會進安全登入，不直接輸出受保護個資或後台營運資料。
- 關懷需求與企業合作需求的聯絡／情境欄位僅在登入後顯示。
- 正式 Email magic-link／新註冊／Email 密碼重設暫停；只在正式 SMTP 修復或更換後，完成真實收件、點擊 callback 與登入成功驗收，才重新開放。

## 搜尋索引邊界

PR #91 已完成三層保護：
- sitemap 只列真正公開頁；不再列 `/my-1percent`、`/login` 等受保護／重複登入內容，`/register` 保留公開索引。
- robots 明確阻擋 `/admin`、`/account`、`/auth`、`/membership`、`/my-1percent`、`/login` 等工作區。
- middleware 對受保護頁、登入頁與 auth 流程加入 `X-Robots-Tag: noindex, nofollow`，未登入 redirect 亦同。
- Preview 與 Production 均已實測：`/my-1percent` 最終登入回應含 `X-Robots-Tag: noindex, nofollow`；Preview sitemap 使用自己的 `VERCEL_URL`，Production sitemap 使用 `https://rcsca-v2.vercel.app`。
- Production sitemap 已確認保留 `/register`，且不含 `/my-1percent`／`/login`；robots 已確認指向正確 Production sitemap。

## 近期已收斂主線

- #77–#82：治理／共享點規則、敏感表單登入閘門、公開資料讀取抗瞬斷、中秋活動狀態、正式站文案、曆年制規則。
- #83：Lv.5「共享守護者」與高階卡片對比補完。
- #84：Production 備份工作流移除非秘密識別資訊的假 secret 依賴。
- #85：建立最新營運基準文件。
- #86：後台「資料與營運準備」頁更新到 10/23 真實狀態。
- #87：首頁移除已結束的 2026 中秋「持續增加中」，改為 2027/01/23 十週年共享感恩晚會。
- #88：認購自然語句支援 `林○○先生認購1單位（1單位＝1000元）`；行內單價與設定不一致時拒絕寫入。
- #89：兩處 `align-items:end` 改為 `flex-end`；原 autoprefixer 相容性警告已消失。
- #91：公開索引、robots 與 noindex 邊界硬化。
- #95：GitHub Actions 的 checkout／setup-node／upload-artifact 升級到 Node 24 runtime release，並以官方 release commit SHA 鎖定；專案本身仍使用 Node 22，application／browser／backup 驗證通過。
- #97：移除已失效的一次性 diagnostics cleanup job。
- #98：Production Auth SMTP 真實測試失敗後，後台 readiness 改以端到端實際結果為準，明確標示 Auth Email 為 launch blocker。

## 首頁動畫／品牌入口

- 入口音效使用 `brand-children-go.mp3`（孩童群呼 Go）。
- 動畫期間鎖 wheel、touchmove、鍵盤捲動、overscroll，不能滑入主站。
- 點擊後播放／淡出再解鎖主站。
- 左上 Logo 固定連到 `/?intro=replay`，可重新播放首頁動畫。
- 音效檔案與動畫 CSS 均存在，browser suite 已覆蓋品牌重播流程。

## 會員／歷史資料／生日

Production 最近核對：
- `public.profiles`：2
- `public.enterprises`：1
- `public.enterprise_applications`：1
- `private.membership_register`：0
- `private.membership_applications`：0
- `private.legacy_members`：0
- `private.legacy_member_claims`：0
- `private.member_birthdays`：0

工程流程已完成，但**正式歷史會員名冊尚未匯入**。

既有能力：
- 歷史會員匯入支援姓名、Email、電話、身分證保護參照、一般／永久會籍、原入會日、會員年度、生日、介紹人文字，採 preview/fingerprint/commit。
- 舊會員自行認領後由管理員核准，可恢復歷史會籍／日期／生日／介紹人；刻意不自動加入小隊、不自動發點。
- 新會員的「介紹人或所屬企業」只有唯一匹配且只有一個有效小隊時才自動帶入；無匹配、同名、多小隊都要求人工確認。
- 年度會員名冊僅顯示姓名、一般／永久、入會日、年資、介紹人；不輸出電話、Email、地址、身分證。
- 生日後台可按月份篩選，只列有效會員且本人同意祝賀者；匯出不含出生年份，匯出前再次檢查權限與同意狀態。

## 會員資料重置／刪除

- reset / delete 前台均需雙重確認後送審。
- `/admin/data-requests` 有核准、開始處理、最終確認執行的真正 executor。
- reset 清點數、XP／等級、足跡、生日、聯絡資料與 MY 1% 偏好；delete 另停用可辨識帳號資料並隱藏論壇內容，同時保留必要會籍歷史與 audit。
- 管理員不得審自己或執行自己的資料申請。

## 共享點／論壇／活動

- 共享點採台灣時間曆年制 1/1–12/31；Account / MY 1% / 共享所顯示餘額與到期資訊，30 天內顯示到期提醒。
- 已核實捐款：每完整 NT$1,000 = 1 共享點；作廢／沖回同步處理。
- 論壇主題：每日最多 1 篇，管理員審核通過後 +2 點；資料庫 daily quota trigger 實際存在。
- 論壇回覆：首次回覆他人的每個已核准主題 +1 點；同會員／同主題／reply 有唯一限制，作者自回不給點。
- 活動只有在狀態 `completed` 後才能由管理員核實；核實成功建立共享足跡。
- 「其他活動核實應給多少共享點／XP」正式規則仍為尚未核定，因此 Production 不自行猜點值。

## 企業共享／共享所

- 企業／團體／店家註冊含公司與窗口資料、1% 提供內容、數量／頻率、服務區域。
- 每期供應另有期別、份數／名額、起訖、圖片、產品配送／服務預約、運費政策等結構化欄位。
- 點數由協會審核核定；企業不能自行決定兌換點數。
- 共享所顯示核定點數、剩餘庫存／服務名額與截止時間；服務預約先保留點數／名額，確認後才扣點。
- 目前運費政策：免運、收件人另付、運費已包含在兌換點數中。
- **獨立運費點數折抵尚未實作**；資料層沒有 `shipping_point_cost` 類欄位。需先核定折抵點值、是否可部分折抵、取消／退點規則後再做，不能自行發明帳務規則。

## Auth Email 與管理通知 Mail Worker

### Supabase Auth Email

- 2026/10/25 真實新使用者寄送驗證連結時，Supabase Auth `/auth/v1/otp` 回 HTTP 500；Auth log 明確顯示 Gmail SMTP `535 5.7.8 Username and Password not accepted`。
- 因此新註冊、Email magic-link 登入與 Email 密碼重設目前全部 fail-closed 暫停。
- CI 的 `verify:mail-config`、worker heartbeat、設定存在或 health check 均**不能**替代實際 Auth 信件收件驗收。
- 重新開放硬條件：正式 SMTP 憑證／服務可用 → 真實信箱收到 → 點擊驗證／magic link → callback 正確 → 成功登入 → 再測 recovery。

### 管理通知 Mail Worker

- Supabase `pg_cron`：`rcsca-admin-mail-dispatch`，每 5 分鐘。
- `automatic_enabled=true`、`manual_enabled=false`。
- scheduler tick／worker seen 有近期更新，worker run 持續 completed。
- 2026/10/25 核對時 `private.admin_mail_outbox` 與 `private.admin_mail_attempts` 均無資料，因此「worker 正常」不能當成管理通知 SMTP 寄送或實際收件已驗收。
- 最新架構使用短效 signed tick、一次性 consume、bounded worker token，不依賴 `SB_SERVICE_ROLE_KEY`。
- 必須用受控待寄項目完成 SMTP accepted 與實際收件確認後，才能把管理通知寄送標成正式驗收完成。

## Production Backup / Recovery

工具與工作流已建置，但**真實 Production 異地備份仍未 READY**。

已完成：
- 每日 Production backup 與每週隔離 restore-format drill 排程。
- 加密備份工具、格式驗證、隔離 restore 測試可通過 CI。
- 最近一次實際 scheduled Production backup 因必要保護設定缺失而 fail-closed；未產生假備份，也未宣稱異地副本成功。
- #84 已把 DB host、DB user、Supabase project ref 這些非秘密資訊移出 Secret 需求。

仍需真實設定：
- `RCSCA_BACKUP_PGPASSWORD`
- `RCSCA_BACKUP_KEY`
- `RCSCA_BACKUP_S3_BUCKET`
- `RCSCA_BACKUP_S3_ACCESS_KEY_ID`
- `RCSCA_BACKUP_S3_SECRET_ACCESS_KEY`
- `RCSCA_BACKUP_S3_REGION`
- 視供應商需要：`RCSCA_BACKUP_S3_ENDPOINT` / `RCSCA_BACKUP_STORAGE_KEY`

只有完成「Production 加密備份 → 異地上傳 → 重新下載驗證 → 隔離還原」後，才能把正式備份標成完成。

## 安全／效能稽核

- 2026/10/25 最新 Security Advisor 無 ERROR；仍有 `pg_net` 位於 public schema、3 支刻意公開的 SECURITY DEFINER RPC、authenticated SECURITY DEFINER 提示與 Leaked Password Protection 未啟用等 WARN。
- 已針對管理升權、會員審核、捐款、ESG、Network、活動核實等高風險 SECURITY DEFINER RPC 實際檢查函式本體；均使用 `auth.uid()` 搭配 `private.is_admin()` 或 `public.admin_roles` 驗證角色。
- 自動掃描未找到「authenticated 可執行＋SECURITY DEFINER＋會寫資料、但完全沒有 auth/admin 身分檢查」的 public RPC；亦未找到 anon 可執行的 SECURITY DEFINER 寫入 RPC。
- Performance Advisor 既有提示不以批次增刪索引或撤權限方式處理；待真實會員／交易資料進入後依 query plan 調整。

## 正式網域

2026/10/25 即時註冊可用性核對：
- `rcsca.org.tw`：不可註冊。
- `rcsca.org`：不可註冊。
- `rcsca.tw`：目前可註冊。
- `rcsca.com.tw`：目前可註冊。

網域購買涉及實際費用與註冊人資料，未經明確付款同意不代購。

## 尚未關閉的正式營運缺口

1. **修復／更換 Supabase Auth 正式 SMTP**，並完成真實註冊信收件、點擊 callback、登入及 recovery 端到端驗收；通過前註冊與 Email magic-link 維持關閉。
2. 用受控真實待寄項目完成管理通知 SMTP accepted＋收件匣確認；worker heartbeat 不算送達證據。
3. 配置 Production backup 真實 DB／加密／異地儲存憑證，取得至少一次「備份 → 異地 → 下載 → 隔離還原」完整成功紀錄。
4. 匯入並核定正式歷史會員名冊，完成舊會員認領、會員年資與生日名單的真實資料驗收。
5. 決定並購買／綁定 RCSCA 自有正式網域；目前只有 `rcsca-v2.vercel.app`。
6. Supabase Leaked Password Protection 仍需在可讀寫 Auth 設定的管理介面啟用並驗收；現有資料庫連接器不能用 SQL 假裝已設定。
7. 完成 iPhone／桌面主要流程最終人工實機驗收；CI/browser 自動測試不等於所有視覺皆已人工確認。
8. 徽章／XP 門檻、「其他活動核實點值」與若要獨立「運費點數折抵」的帳務規則，未正式核定前不自行填值。

## 原則

- 沒有真實證據，不把「工具存在」「CI 模擬成功」「排程有觸發」「設定已填」寫成 Production 備份／通知／註冊已完整驗收。
- Production 資料與權限優先 fail-closed；不使用 publishable key、假 secret 或繞過授權來解決部署問題。
- 已核定需求採最後版本；未核定帳務／等級規則不自行補數字。
