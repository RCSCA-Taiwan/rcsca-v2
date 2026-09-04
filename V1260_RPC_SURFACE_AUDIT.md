# V1260 RPC 攻擊面稽核

日期：2026-09-02  
環境：RCSCA V2 Staging

## 結論

前端實際使用 52 個 RPC；修正前 authenticated 可直接執行 58 個 SECURITY DEFINER 函式。多出的 6 個不需要成為 Data API endpoint。

| 指標 | 修正後 |
| --- | ---: |
| 前端 RPC | 52 |
| 前端 RPC 存在且 authenticated 可執行 | 52／52 |
| authenticated 可執行 SECURITY DEFINER | 52 |
| 額外對外開放函式 | 0 |
| anon 可執行 SECURITY DEFINER | 0 |

## 撤銷外部 EXECUTE

已被新版流程取代或未使用：

- admin_finalize_esg_asset
- admin_mark_esg_report_ready
- admin_update_network_match
- queue_completed_outcome

僅供資料庫函式內部使用：

- is_active_member
- is_enterprise_manager

兩個內部 helper 撤銷 authenticated EXECUTE 後，受控 RPC 的內部呼叫仍正常；負向測試分別到達 active_membership_required 與 manager_required，沒有 helper 權限錯誤。

## 預防措施

public schema 後續新增函式不再自動授予 PUBLIC、anon、authenticated EXECUTE；需要成為前端 RPC 的函式必須在 migration 明確 grant。

## 保留事項

剩餘 52 個 Advisor 提示均對應前端實際 RPC，刻意保留 authenticated EXECUTE，並由函式內部身份／角色條件授權。
