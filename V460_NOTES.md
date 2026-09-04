# V460 — 身份／會籍／驗證營運閉環

- `/account/identity` 不再用手動切換角色模擬身份，改讀取 memberships、identity_verifications、enterprise_users。
- 新增 `/account/identity/verify`：登入者可提出身份驗證；可選識別碼只保存 SHA-256 雜湊，不保存原始值。
- 新增 `/admin/members`：管理端核實身份、退回驗證、設定 annual/lifetime 正式會籍。
- 新增 RPC：`request_identity_verification`、`admin_review_identity_verification`、`admin_set_membership`，全部寫入 audit log；驗證／會籍結果寫入通知。
- 一般會員與永久會員前台仍統一顯示 `RCSCA MEMBER`，不形成共享等級差異。
- `/account/data-status` 移除「整站仍是假資料／尚未接 Supabase」的過期說明，改成 Staging 與舊資料遷移狀態。
- 財務、會費、身份驗證都不直接產生 XP 或共享點。
