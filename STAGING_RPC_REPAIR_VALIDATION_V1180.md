# RCSCA V2 Staging RPC 修復驗證（V1180）

驗證日期：2026-09-01

## 結論

6 個前端所需的管理 RPC 已在 RCSCA V2 Staging 修復。正式環境未變更。

## 已套用 migration

1. `v1180_restore_missing_admin_rpcs`
2. `v1181_resolve_outcome_rpc_overload`
3. `v1182_normalize_outcome_admin_rpcs`

## 驗證結果

| 項目 | 結果 |
| --- | --- |
| 6 個 RPC 函式簽章 | 通過 |
| 重複／舊版 overload | 已移除 |
| `anon` EXECUTE | 全部撤銷 |
| `authenticated` EXECUTE | 全部保留，函式內再檢查管理角色 |
| `SECURITY DEFINER` 固定 search path | `search_path=public` |
| 未登入／無管理角色防護 | 通過 |
| 管理員成功路徑 | 待測試帳號建立後執行 |

## 待完成事項

Staging 目前 `auth.users` 為 0，無法建立可登入的管理員測試情境，因此尚未執行 6 個 RPC 的正向資料異動測試。建立測試管理員後，應驗證成功回傳、稽核紀錄、通知、冪等性與狀態轉換。

資料庫 migration 歷史與版本庫早期 migration 仍有基線漂移，建議另行建立 schema baseline 對帳工作，不應與本次 6 個 RPC 修復混為同一阻擋。

Supabase Advisor 仍報告既有 SECURITY DEFINER 可執行範圍、未索引外鍵、RLS init-plan、重複 permissive policies 與重複索引等技術債；本次新增的 6 個 RPC 已確認沒有匿名執行權限。
