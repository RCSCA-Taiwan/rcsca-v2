# RCSCA V2 — Current Operational Baseline

> 最新營運基準：2026-10-23（Asia/Taipei）。如本檔與 `PROJECT_STATUS.md` 的舊版本段落衝突，以本檔及最新 Production / CI 紀錄為準；`PROJECT_STATUS.md` 保留歷史演進用途。

## Production

- GitHub `main` 最新核對基準：`6358465f68360c880c627fadcee9a2791e29d879`（Reduce backup secret configuration surface）。
- Vercel Production：READY。
- 正式別名：`https://rcsca-v2.vercel.app`。
- Production Supabase：`zoogppmgajbiridffohm`，ACTIVE_HEALTHY。
- `NEXT_PUBLIC_REGISTRATION_OPEN=true`；`NEXT_PUBLIC_AUTH_EMAIL_ENABLED=true`。

## 已實際核對的公開／受保護入口

- `/`：200；首頁動畫與正式導覽可載入。
- `/register`：200；個人與企業／團體／店家註冊入口存在。
- `/my-1percent`：未登入導向安全登入，不直接露出個人資料。
- `/membership/apply`：未登入導向安全登入；正式會籍與一般網站帳號分流。
- `/care-actions`：200；可從 Production Supabase 取得正式公開活動資料。
- `/care-actions/request`：200；未登入時不輸出聯絡／個案敏感欄位，只顯示登入閘門。
- `/1percent-partner`：200；企業共享合作夥伴公開入口正常。
- `/1percent-partner/esg`：200；未登入時企業聯絡與需求表單不顯示，只顯示登入閘門。
- `/governance`：200；治理資料及共享點政策已更新。

## 近期已收斂的主線修正

- PR #77：治理頁共享點規則對齊。
- PR #78：關懷需求與企業合作需求敏感欄位改為登入後才顯示。
- PR #79：公開 Supabase 讀取遇暫時性網路／JSON 失敗時降級，不再讓整頁直接 500。
- PR #80：2026 中秋行動改為已完成狀態。
- PR #81：移除正式站上的 prelaunch 文案。
- PR #82：公開共享規則對齊曆年制。
- PR #83：Lv.5／共享守護者對比補完。
- PR #84：正式備份工作流移除不必要的「非秘密資訊 secret」依賴。

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

## 會員／歷史資料現況

2026-10-23 Production 核對：
- `public.profiles`：2
- `public.enterprises`：1
- `public.enterprise_applications`：1
- `private.membership_register`：0
- `private.membership_applications`：0
- `private.legacy_members`：0
- `private.legacy_member_claims`：0
- `private.member_birthdays`：0

結論：會員制度、舊會員認領與生日結構已實作，但**正式歷史會員名冊尚未匯入**。

既有舊會員匯入支援：姓名、Email、電話、身分證保護參照、一般／永久會籍、原始入會日、會員年度、生日、介紹人文字；匯入採 preview/fingerprint/commit，避免未預覽內容直接寫入與部分寫入。

新會員的「介紹人或所屬企業」自由輸入會解析正式會員／核准企業，只有唯一小隊時才自動帶入；無匹配、同名歧義或多小隊不會自動亂配。

舊會員認領核准會恢復歷史會籍、日期、生日與介紹人文字，但刻意**不自動加入小隊、不自動發放積分**；組織關係需另外確認。

## 尚未關閉的正式營運缺口

1. 匯入並核定正式歷史會員名冊，之後才能驗收舊會員自行認領、會員年資與生日名單的真實資料流程。
2. 配置真實 Production backup 的 DB／加密／異地 S3 憑證，取得至少一次完整成功的異地備份與隔離還原證據。
3. 徽章／XP 門檻若尚未由協會正式核定，不應自行填入正式規則。
4. 完成真實新註冊端到端驗收，以及審核通知有實際待寄項目時的收件驗收。
5. 持續做手機／桌機實機視覺與操作驗收；build/CI 通過不等於所有實機 UI 已驗收。

## 非目前阻斷項

- Supabase Advisor 仍有 SECURITY DEFINER、未覆蓋外鍵索引、unused index、multiple permissive policies 等提示。現有 RPC 架構大量以 SECURITY DEFINER 封裝授權，不能為消除警告而批次撤權限；需逐函式確認授權邊界再處理。
- `pg_net` 位於 public schema、Leaked Password Protection 未啟用等安全提示應列入後續硬化，但目前不以未驗證方式直接修改 Production Auth / extension 設定。

## 原則

- 沒有真實證據，不把「工具存在」「CI 模擬成功」「排程有觸發」寫成 Production 備份／通知／註冊已完整驗收。
- Production 資料與權限優先 fail-closed；不以 publishable key、假 secret 或繞過授權的方式解決部署問題。
