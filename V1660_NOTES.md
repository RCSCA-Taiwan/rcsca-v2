# V1660 既有會員年度名冊匯入

管理員可在 `/admin/members/import` 下載空白 CSV 範本、選取 UTF-8 檔案、預覽每筆問題，再填核對依據與勾選確認，將資料列入台灣當年度名冊。適用已完成會籍審核、信箱已驗證的有效會員；每批限 100 筆、128 KB。

- 僅接收登入信箱、會員姓名、會籍類型、原入會日期與介紹人登入信箱。身分證、電話和地址不在此匯入流程接收；使用既有會員申請流程處理新會籍。
- 以已驗證的登入帳號信箱核對，不靠姓名猜帳號。永久／一般會籍必須與已核准會籍一致，不透過 CSV 升降級、不建立帳號、不自動啟用會籍、不自動加入小隊。
- 拒絕重複信箱、無效或未來日期、原入會日期衝突、未審結申請、已登錄年度及無效介紹人。介紹人留空時沿用已確認的歷史介紹來源，包含企業介紹來源。
- 預覽無資料寫入。登錄時重新鎖定核對，預覽後狀態變更就整批阻擋；同批重試有唯一識別與內容比對，避免網路中斷後重複登錄。登錄與稽核在同一交易，沒有部分成功。
- 批次表置於私有 schema、RLS 開啟且無直接資料表授權；只透過明確檢查會員管理員權限的函式處理。公開包裝為 security invoker。一般會員與非會員管理專員無匯入權。
- 補上舊版後台會籍設定的原入會日期與永久會員保護，移除自動把日期填成今天的操作。一般名冊確認也沿用最早已確認日期，將首次核對日期補入原本空白的會籍欄位；不重設既有日期。
- 原入會日期影響積分效期，預覽與最後確認均提醒操作人核對正式來源。範本不含虛構會員資料；檔案只保留於當頁記憶體，不加入 localStorage 或原始碼庫。

本地驗證：6 項 CSV 解析測試、TypeScript／正式建置；測試資料庫完整回滾測試涵蓋權限、已驗證帳號、重複與錯誤日期、會籍衝突、舊預覽、確認與重試、防部分寫入、介紹來源沿用、積分與小隊不變，以及舊版日期／永久會籍保護。完整資料庫重建與手機操作由隔離 CI 驗證。

正式會員名單尚未提供，未把測試資料當成正式資料匯入。徽章名稱／門檻核定、實際加密備份與異地還原演練、實體手機驗收仍列待辦。V1650 的備份工具完成不代表已取得正式資料備份。


## Explicit personal and enterprise registration

- Public `/register` provides personal registration and `/register?type=enterprise` provides the enterprise route. Home, mobile/desktop navigation, login and enterprise landing include explicit links. Email verification preserves the intended destination and personal team invitation. Existing accounts use their original identity.
- Enterprise verification continues to `/1percent-partner/apply`: enterprise/shop name, eight-digit tax ID, industry, city/region, address, optional HTTP(S) website, contact name/title/email, company phone, optional extension, mobile, product/service type and detailed contribution. Four steps include a full confirmation summary.
- New authenticated invoker RPC validates input, verified/active account, request idempotency, duplicate applications and owner-only needs-info corrections. No automatic membership, enterprise approval, published share or badge. Legacy submissions remain reviewable.
- Application addresses, contacts and proposed contributions remain accessible only to the applicant and enterprise reviewers/admins. Reviewer cards show all collected details. Industry carries into approved enterprise records; contact details are not copied into public enterprise profiles.
- Staging rollback SQL verifies validation, access, retries, correction and approval behavior. CI additionally verifies actual disposable verification email → PKCE callback → profile, mobile enterprise data entry, saved pending record, independent reviewer correction and resubmission. Production email delivery depends on the existing configured email provider; no real user email was sent for testing.
