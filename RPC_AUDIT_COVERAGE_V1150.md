# 管理 RPC 與稽核覆蓋盤點（v1150）

## 已在 migration 中定義且包含稽核寫入

| RPC | 主要用途 | 稽核 |
|---|---|---:|
| admin_verify_participation | 活動參與核實 | ✓ |
| admin_review_network_response | Network 媒合審核 | ✓ |
| admin_review_enterprise_share | 企業共享審核 | ✓ |
| admin_review_enterprise_application | 企業加入審核 | ✓ |
| admin_review_reward_redemption | 回饋核銷 | ✓ |
| admin_review_identity_verification | 身份核實 | ✓ |
| admin_set_membership | 會籍設定 | ✓ |
| admin_upsert_activity | 活動主檔 | ✓ |
| admin_update_support_case | 需求案件 | ✓ |
| admin_issue_enterprise_badge | 標章核發 | ✓ |
| admin_revoke_enterprise_badge | 標章撤回 | ✓ |
| admin_review_record_change | 公開資料變更 | ✓ |
| admin_set_platform_role | 後台角色 | ✓ |
| admin_upsert_team | 共享小隊 | ✓ |
| admin_upsert_reward_catalog | 回饋目錄 | ✓ |

## 前端已呼叫，但目前專案 migration 找不到定義

以下六個 RPC 在管理介面已使用，但目前版本庫的 Supabase migrations 中找不到函式定義。若正式資料庫也沒有另外部署，相關頁面會在執行時失敗。

| RPC | 影響頁面 | 風險 |
|---|---|---|
| admin_generate_outcome_drafts | 後台成果佇列 | 無法建立成果草稿 |
| admin_publish_cycle_story | 善循環成果草稿 | 無法發布案例 |
| admin_approve_esg_asset | ESG 成果草稿 | 無法核准素材 |
| admin_set_esg_evidence_review | ESG 證據工作台 | 無法開放或暫緩報告 |
| admin_mark_case_due_reminder | 企業案件 | 無法處理到期提醒 |
| admin_update_enterprise_service_request | 企業案件 | 無法更新案件狀態 |

## 上線判定

此項為阻擋上線問題，不能用前端建置成功取代資料庫驗證。下一步需先比對正式 Supabase 的實際函式清單；若確實缺少，必須新增受權限控制且包含 audit_logs 寫入的 migrations。

本版依既定限制不修改 schema、RPC 或 RLS。
