RCSCA V2 Platform V310

V310 adds enterprise case timelines, enterprise-side supplements/replies, and clearer admin next-action updates.

# RCSCA V2 Platform V180

本版延續 V170，新增企業端直接送出共享內容、後台統一工作佇列，並配合 Staging migration 將 1% Network 媒合完成正式寫入雙方共享足跡。

視覺規則持續鎖定：品牌入口 RCSCA / Cycle of Goodness / 1% 同組停留；全站文字不得以低對比製造質感。

# RCSCA V2 Platform V130

V130 將登入後的個人端從「讀資料」推進到第一批真正可寫入 Staging 的安全流程。

## 本版完成
- 個人基本資料可自行更新：只開放顯示名稱、手機、語系等低風險欄位；會籍、等級、XP、共享點、管理權限不能自行修改。
- 「我的共享紀錄」改為讀取真實 `sharing_footprints`。
- 「我的需求與進度」改為讀取真實 `network_requests`。
- 生活找人／專業媒合需求可由已登入使用者直接寫入 Staging，且只能建立自己的需求。
- 公益行動參與可由已登入使用者直接登記；狀態固定從 `pending` 開始，不能自行核實。
- 新增 migration `0006_self_service_authenticated_writes.sql`，與 Staging 已部署規則一致。

## 還刻意沒有開放
- 使用者不能自行增加 XP 或共享點。
- 使用者不能自行成為 RCSCA MEMBER。
- 使用者不能自行建立管理者身份。
- 使用者不能自行把活動參與改為已核實。
- 企業核准、企業年度標章與個案限制資料仍由後台流程控制。

## 部署前仍需設定
Vercel Environment Variables：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Supabase Auth URL Configuration 也需要加入 Vercel 正式／預覽站的 `/auth/callback` 允許網址，Magic Link 才能完整回站。

## V140 changes
- Brand entrance: RCSCA + Cycle of Goodness now remain visible together with 1% until the entrance overlay itself leaves.
- Global readability pass: text/table contrast hardened; muted text no longer relies on ultra-low opacity.
- Added staging performance-index migration for RLS / foreign-key paths.

## V170 workflow milestone
- 企業管理入口改讀取登入企業的真實 Staging 資料。
- 1% Network 新增媒合回應資料表與前台送出流程；私人聯絡方式仍需另外同意。
- 後台活動核實頁改為讀取真實待核實佇列，並呼叫受管理角色保護的核實 RPC。
- 企業可送出共享內容，但只能進入審核狀態，不能自行核准或公開。


## V170 新增
- 1% Network 雙方同意後才交換聯絡方式。
- 聯絡資訊只建立給媒合雙方，不公開在 Network 名錄。
- 企業共享內容新增後台審核與企業通知。
- 通知中心開始使用 Staging 真實資料。


## V170
- 企業補件後可重新送審（仍不可自行核准／公開）
- 1% Network 後台媒合審核、補件、成立、完成與通知閉環
- Audit Log 持續記錄管理操作
- 延續品牌動畫常駐字樣與全站高對比文字規則

## V190
- MY 1% / 我的共享紀錄新增真實足跡摘要與「關懷／共享連結」視覺比例。
- 企業影響力頁改讀 Supabase security-invoker view，只彙整已核准共享與已完成 Network 成果。
- 成果頁不使用捐款金額作為影響力指標。


## V200
- Cycle of Goodness 真實案例改讀取已同意、匿名化、審核通過的資料。
- MY 1% 帳號首頁加入已核實共享摘要。
- 企業影響力頁加入 ESG 素材庫資料層。
- 新增 cycle_stories / enterprise_esg_assets staging schema。

## Platform V210
- 新增成果整理工作區 `/admin/outcomes`。
- 完成的公益、Network、企業合作可先進 `outcome_review_queue`，再決定是否形成 Cycle of Goodness 公開案例或企業 ESG 素材。
- 公開案例仍要求公開同意、匿名化與 RCSCA 審核；「完成」不等於「自動公開」。

## V220
- 成果整理工作區可從已完成成果建立「善循環案例草稿」與「企業 ESG 素材草稿」。
- 草稿建立不等於公開：善循環案例仍需公開同意、匿名化與人工審核。
- 同一來源以唯一索引避免重複建立成果草稿。

## V230
- 後台成果草稿審核：善循環案例必須確認公開同意，必要時匿名化後才可發布。
- ESG 素材人工確認後才核准，並通知該企業管理者。
- 發布與核准均寫入 Audit Log；沒有把「完成成果」直接等同於「可公開」。

## V250
- Enterprise ESG annual summary reads only approved, report-ready assets.
- Enterprise impact page now includes an annual report index before the detailed ESG asset library.
- Added controlled admin RPC to mark/unmark approved ESG assets as report-ready, with Audit Log.
- No donation amount is used as an impact metric; metrics with unlike units are not presented as a single impact score.

## V270
- Enterprise annual report-ready view connected to enterprise portal.
- ESG service page now leads with three concrete service modules: design, execution/matching, outcomes/reporting.
- No cross-unit impact score; evidence and source traceability remain required.

## V280
企業 ESG 服務正式案件化：合作健檢／專案執行／年度 ESG 合作；登入後送出即建立 ESG-YYYY-xxxxx 案件編號，企業合作進度改讀真實 Staging 資料。

## V290
- 企業 ESG 案件後台：受理、補件、確認、執行、完成。
- 完成案件自動進入成果整理工作流，銜接 Cycle of Goodness 與 ESG 素材。
- 企業端顯示下一步與預計節點。


## V310
- RCSCA 承辦工作台：我的案件、逾期提示、企業最新補件時間。
- 企業補件會自動形成承辦下一步提醒，不以金額決定案件優先序。

## V330
- Enterprise ESG evidence-chain view deployed to Staging.
- Enterprise impact page now shows report-ready outcome provenance and verification status.
- ESG export payload now includes summary, metrics, SDGs, evidence note, source type/reference and verification state.

## V340
- Added ESG delivery-readiness checks: approved + report-ready + quality-complete + source-verified.
- Added enterprise management summary by reporting period.
- Enterprise impact UI now distinguishes prepared material from formally deliverable evidence-backed results.

## V401
- Fix Vercel build blocker: admin enterprise-cases SiteHeader import now resolves to app/SiteHeader.tsx.
- Relative-import static scan: 0 missing local imports.

## V410
- Removed the decorative pseudo-star grid from the brand entrance; the opening now relies on restrained light traces and a cinematic vignette.
- Added a real mobile navigation menu so every primary route remains reachable on phones.
- Moved the homepage quick-route guide below the main brand statement for a cleaner first impression.
- Strengthened enterprise ESG first-screen hierarchy with a visible 3-stage service chain.
- Unified public portal hero treatment, heading behavior, text contrast, and the sprout/root growth axis.

## V530
已核准公開資料的修改／下架改走變更申請與管理審核；Network 回應、共享所兌換、公益登記與 ESG 合作案件建立改走受控 RPC，避免前端直接寫入關鍵營運資料。
