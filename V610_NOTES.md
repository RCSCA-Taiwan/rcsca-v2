# V610｜登入與帳號復原閉環

- 登入頁支援 Email 安全連結與 Email＋密碼兩種方式。
- 已設定密碼的使用者不必只能依賴 Magic Link。
- 新增 /auth/recover 忘記密碼／帳號復原流程。
- 密碼重設必須先通過 Email 驗證，再回到帳號安全頁設定新密碼。
- auth callback 支援安全的站內 next 路徑，並保留共享小隊邀請處理。
- Supabase Auth Email 驗證完成後，自動同步 profiles.email；密碼不進 public schema。
