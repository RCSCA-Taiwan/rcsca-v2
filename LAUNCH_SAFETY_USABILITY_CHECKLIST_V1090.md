# RCSCA V2 上線前安全與可用性清單 — v1090

## 已確認

- 正式建置與型別檢查持續通過。
- 使用者端高風險流程不直接顯示後端原始錯誤。
- 公益登記、生活媒合、人才需求都有明確欄位名稱與即時操作回饋。
- 鍵盤焦點使用全站一致的 `focus-visible` 樣式。
- 敏感資料、會員身份、企業權限與公開資料維持既有 RLS／RPC 邊界。
- Production Auth Email 發生真實 SMTP 故障時，註冊、Email magic-link 與 recovery 已可 fail-closed 暫停，不讓使用者持續撞錯誤。

## 正式發布硬性門檻

- **Auth Email 不接受「設定存在／CI 通過」代替實測**：必須由 Production 發出新註冊信，真實信箱收到，點擊驗證連結，callback 正確並成功登入。
- Email magic-link 與 password recovery 必須各完成一次 Production 真實收件、點擊與成功結果。
- 管理通知必須建立受控待寄項目，確認 SMTP accepted 且真實收件匣收到；worker heartbeat／completed run 不算送達證據。
- Production backup 必須完成「加密備份 → 異地上傳 → 重新下載驗證 → 隔離還原」至少一次；只有 CI restore-format 測試不算正式備份完成。
- 正式網域綁定後，必須重新驗證 Auth redirect URL、callback、HTTPS、canonical URL、sitemap 與主要登入流程。
- 所有會產生實際外部副作用的第三方服務（寄信、備份、網域／DNS）都要有 Production 真實交易或端到端成功證據。

## 上線前仍需完成

- 真實測試帳號的個人、企業、審核與最高管理角色驗收。
- Supabase 正式環境 RLS、Auth 設定、Leaked Password Protection 與 Redirect URL 最終驗證。
- 手機尺寸、鍵盤導覽、錯誤恢復及慢速網路驗收。
- 隱私政策、使用原則與正式聯絡資訊最終核對。
- 正式歷史會員資料匯入後，抽樣核對會籍、入會日期、生日、介紹人及權限是否正確。

## 發布判定原則

只有「使用者真的完成」或「資料真的可復原」才算通過。CI、排程、heartbeat、設定欄位存在、API health=ok 都只能證明對應技術層存活，不能單獨把外部營運流程標示為正式可用。
