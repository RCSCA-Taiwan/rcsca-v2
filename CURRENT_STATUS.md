# RCSCA V2 — Current Operational Baseline

> 最新營運基準：2026-10-23（Asia/Taipei）。如本檔與 `PROJECT_STATUS.md` 的舊版本段落衝突，以本檔及最新 Production / CI 紀錄為準；`PROJECT_STATUS.md` 保留歷史演進用途。

## Production

- GitHub `main` 最新核對基準：`501b512a7119c9dded794a8ae8e87059b445009a`（Remove CSS flex-end compatibility warnings）。
- Vercel Production：READY。
- 正式別名：`https://rcsca-v2.vercel.app`。
- Production Supabase：`zoogppmgajbiridffohm`，ACTIVE_HEALTHY。
- `NEXT_PUBLIC_REGISTRATION_OPEN=true`；`NEXT_PUBLIC_AUTH_EMAIL_ENABLED=true`。
- 最近 1 小時 Production runtime errors：0。
- 目前 GitHub open PR：0（本狀態更新 PR 建立前）。

## 已實際核對的公開／受保護入口

- `/`：200；首頁動畫與正式導覽可載入。
- `/register`：200；個人與企業／團體／店家註冊入口存在；Production 註冊開關已確認為 true。
- `/my-1percent`：未登入導向安全登入，不直接露出個人資料。
- `/membership/apply`：未登入導向安全登入；正式會籍與一般網站帳號分流。
- `/care-actions`：200；可從 Production Supabase 取得正式公開活動資料。
- `/care-actions/request`：200；未登入時不輸出聯絡／個案敏感欄位，只顯示登入閘門。
- `/1percent-partner`：200；企業共享合作夥伴公開入口正常。
- `/1percent-partner/esg`：200；未登入時企業聯絡與需求表單不顯示，只顯示登入閘門。
- `/governance`：200；治理資料及共享點政策已更新。
- `/admin/operations`：未登入會導向登入頁，不匿名曝露備份、稽核及後台營運資訊。

## 近期已收斂的主線修正

- PR #77：治理頁共享點規則對齊。
- PR #78：關懷需求與企業合作需求敏感欄位改為登入後才顯示。
- PR #79：公開 Supabase 讀取遇暫時性網路／JSON 失敗時降級，不再讓整頁直接 500。
- PR #80：2026 中秋行動改為已完成狀態。
- PR #81：移除正式站上的 prelaunch 文案。
- PR #82：公開共享規則對齊曆年制。
- PR #83：Lv.5／共享守護者對比補完。
- PR #84：正式備份工作流移除不必要的「非秘密資訊 secret」依賴。
- PR #85：新增最新營運基準文件，避免舊 `PROJECT_STATUS.md` 誤導接續作業。
- PR #86：管理員「上線準備度」頁更新為目前 Production 真實狀態。
- PR #87：首頁移除已結束的 2026 中秋「持續增加中」內容，改顯示 2027/01/23 十週年共享感恩晚會。
- PR #88：認購批次自然語句支援 `林○○先生認購1單位（1單位＝1000元）`，並拒絕與上方設定不一致的行內單價。
- PR #89：將兩處 `align-items:end` 改為相容性較完整的 `flex-end`；Vercel build 原 autoprefixer warning 已消失。

## 首頁動畫／品牌入口

- 入口音效使用 `brand-children-go.mp3`（孩童群呼 Go）。
- 動畫顯示期間鎖定 wheel、touchmove、鍵盤捲動與 overscroll，無法用滑動跳過首頁動畫。
- 點擊後才進入 fading，再解鎖主站。
- 左上 Logo 連到 `/?intro=replay`，可從首頁或其他頁重新播放動畫。
- Desktop / mobile browser suite 均已驗證品牌重播與 Go 音效入口流程。

## 會員／歷史資料與生日

2026-10-23 Production 核對：
- `public.profiles`：2
- `public.enterprises`：1
- `public.enterprise_applications`：1
- `private.membership_register`：0
- `private.membership_applications`：0
- `private.legacy_members`：0
- `private.legacy_member_claims`：0
- `private.member_birthdays`：0

結論：會員制度、舊會員認領、生日名單、會員年資與名冊 UI 已實作，但**正式歷史會員名冊尚未匯入**。

既有舊會員匯入支援：姓名、Email、電話、身分證保護參照、一般／永久會籍、原始入會日、會員年度、生日、介紹人文字；匯入採 preview/fingerprint/commit，避免未預覽內容直接寫入與部分寫入。

新會員的「介紹人或所屬企業」自由輸入會解析正式會員／核准企業，只有唯一小隊時才自動帶入；無匹配、同名歧義或多小隊不會自動亂配。

舊會員認領核准會恢復歷史會籍、日期、生日與介紹人文字，但刻意**不自動加入小隊、不自動發放積分**；組織關係需另外確認。

生日後台可按月份篩選，只列有效會員且本人同意生日祝賀者；匯出不含出生年份，且匯出前會重新檢查權限與最新同意狀態。

## 會員資料重置／刪除

- 前台 reset / delete 均要求兩次確認後送審。
- 後台 `/admin/data-requests` 有核准、開始處理、最終確認執行的實際 executor 流程，不是只有送審畫面。
- reset 會清點數、XP/等級、足跡、生日、聯絡資料與 MY 1% 偏好；delete 另停用帳號可辨識資料並隱藏論壇內容，但保留必要會籍歷史與 audit。
- 管理員不能審自己或執行自己的資料申請。

## 積分／論壇／活動核實

- 共享點採台灣時間曆年制 1/1–12/31；Account / MY 1% / 共享所顯示餘額與到期資訊，30 天內可顯示到期提醒。
- 已核實捐款：每完整 NT$1,000 = 1 共享點；作廢／沖回會同步處理對應點數。
- 論壇主題：台灣時間每日最多送出 1 篇；獨立管理員審核通過後 +2 點。
- 論壇回覆：首次回覆他人的每個已核准主題 +1 點；同一會員／同一主題／reply 有唯一限制，作者自回不給點。
- 活動參與只有在活動狀態為 `completed` 後，管理員才能核實完成；核實後建立共享足跡。
- 「其他活動核實要發多少共享點／XP」目前正式規則頁仍標為尚未核定，因此 Production 不會自行猜測點值或自動發放。

## 企業共享／共享所

- 合作夥伴註冊含公司／店家、窗口、1% 提供內容與數量／頻率／服務區域等資訊。
- 核准後的「每期供應」另有期別、本期份數／名額、兌換起訖、產品配送／服務預約、圖片、配送／運費說明等結構化欄位。
- 共享所顯示核定點數、剩餘庫存／服務名額與截止時間；服務預約先保留點數與名額，夥伴確認後才扣點。
- 目前配送政策支援：免運、收件人另付、運費已包含在兌換點數中。
- 若協會要做「商品點數與運費點數分開、會員另選點數折運費」，目前 schema 尚未有獨立 `shipping_point_cost` 類欄位；需先核定折抵點值、是否可部分折抵及取消／退點規則，再安全實作，不能自行發明帳務規則。

## 管理通知 Mail Worker

- Supabase `pg_cron`：`rcsca-admin-mail-dispatch`，每 5 分鐘執行。
- `automatic_enabled=true`、`manual_enabled=false`。
- scheduler tick 與 worker seen 均有近期更新；近期 worker runs 為 `completed`。
- 當次核對時 outbox 無待寄或失敗堆積。
- 最新架構使用短效 signed tick、一次性 consume 與 bounded worker token；Production worker 不依賴 `SB_SERVICE_ROLE_KEY`。
- 舊版曾出現 `admin_mail_worker_unavailable`；目前資料庫排程與 worker heartbeat 不支持「現行 worker 故障」的判斷。
- 真實審核通知的最終收件驗收，仍應在有受控測試／實際待寄項目時另外確認；不可用空 outbox 當作投遞完成證據。

## Production Backup / Recovery

程式與驗證工具已存在，但**真實 Production 異地備份目前仍未達 READY**。

已確認：
- GitHub Actions 有每日 Production backup 與每週隔離 restore-format drill 排程。
- 備份工具、加密格式與隔離 restore 測試可通過 CI。
- 最近一次實際 scheduled Production backup 在「必要保護設定檢查」即 fail-closed；未建立假備份，也未宣稱異地副本／還原成功。
- PR #84 已將非秘密連線識別固定於 workflow：Production DB host、DB user、Supabase project ref 不再要求另建 GitHub Secrets。

仍需真實設定後才能完成：
- `RCSCA_BACKUP_PGPASSWORD`
- `RCSCA_BACKUP_KEY`
- `RCSCA_BACKUP_S3_BUCKET`
- `RCSCA_BACKUP_S3_ACCESS_KEY_ID`
- `RCSCA_BACKUP_S3_SECRET_ACCESS_KEY`
- `RCSCA_BACKUP_S3_REGION`
- 視儲存供應商需要時再設定 `RCSCA_BACKUP_S3_ENDPOINT` / `RCSCA_BACKUP_STORAGE_KEY`

完成上述設定後，才可將「Production 加密備份 → 異地上傳 → 重新下載驗證 → 隔離還原演練」標記為正式完成。

## 尚未關閉的正式營運缺口

1. 匯入並核定正式歷史會員名冊，之後才能驗收舊會員自行認領、會員年資與生日名單的真實資料流程。
2. 配置真實 Production backup 的 DB／加密／異地 S3 憑證，取得至少一次完整成功的異地備份與隔離還原證據。
3. 徽章／XP 門檻與「其他活動核實點值」若尚未由協會正式核定，不應自行填入正式規則。
4. 完成真實新註冊端到端驗收，以及審核通知有實際待寄項目時的收件驗收。
5. 若要提供「獨立運費點數折抵」，先核定商品／運費點值與取消退點規則，再新增資料層與交易邏輯；目前只支援「運費已包含在兌換點數中」。
6. 正式自有網域尚未綁定；目前僅 Vercel `vercel.app` 網域。
7. 持續做手機／桌機實機視覺與操作驗收；build/CI 通過不等於所有實機 UI 已驗收。

## 非目前阻斷項

- Supabase Advisor 仍有 SECURITY DEFINER、未覆蓋外鍵索引、unused index、multiple permissive policies 等提示。現有 RPC 架構大量以 SECURITY DEFINER 封裝授權，不能為消除警告而批次撤權限；需逐函式確認授權邊界再處理。
- `pg_net` 位於 public schema、Leaked Password Protection 未啟用等安全提示應列入後續硬化，但目前不以未驗證方式直接修改 Production Auth / extension 設定。
- Vercel build 目前仍有 npm runner 的 `Unknown env config "cache-dir"` 提示；repo 內沒有 `.npmrc` 或 `cache-dir` 設定，非專案 CSS／應用程式錯誤。

## 原則

- 沒有真實證據，不把「工具存在」「CI 模擬成功」「排程有觸發」寫成 Production 備份／通知／註冊已完整驗收。
- Production 資料與權限優先 fail-closed；不以 publishable key、假 secret 或繞過授權的方式解決部署問題。
