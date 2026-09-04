# v1150

- Audit Log 新增操作、對象、角色、操作者與備註搜尋。
- Audit Log 顯示操作者識別碼前八碼、符合筆數與重新整理狀態。
- Audit Log 補強四語搜尋及操作文字、ARIA live status。
- 完成管理 RPC 與 migration 稽核寫入盤點。
- 發現六個前端已呼叫但專案 migrations 中找不到定義的 RPC。
- 將缺失 RPC 列為正式環境阻擋上線問題。
- 未變更 Supabase schema、RPC 或 RLS。
