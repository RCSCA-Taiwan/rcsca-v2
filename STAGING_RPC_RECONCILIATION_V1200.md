# Staging RPC 完整對帳 V1200

驗證日期：2026-09-01

## 結論

前端實際呼叫 52 個 RPC，RCSCA V2 Staging 已存在 52 個，缺失 0 個。

## 本版修復

| 流程 | RPC |
| --- | --- |
| 企業合作申請 | `submit_enterprise_application` |
| 企業申請審核 | `admin_review_enterprise_application` |
| 客服案件提交 | `submit_support_case` |
| 身份驗證申請 | `request_identity_verification` |
| 身份驗證審核 | `admin_review_identity_verification` |
| 會員資格設定 | `admin_set_membership` |
| 共享回饋兌換審核 | `admin_review_reward_redemption` |
| 企業共享補件 | `enterprise_resubmit_share` |

## 驗證

- 8 個 RPC 均撤銷 `anon` 執行權限。
- 8 個 RPC 均保留 `authenticated` 入口並在函式內執行身份或管理角色檢查。
- 8 個 RPC 均為 `SECURITY DEFINER` 且固定 `search_path=public,private`。
- Supabase Security Advisor 未對這 8 個 RPC產生匿名 SECURITY DEFINER 警告。
- Staging schema 產生的 TypeScript 型別已接入 Supabase client。
- Production build 與 70 條路由建置成功。

## 尚未完成

Staging 目前沒有 Auth 使用者，因此無法執行會員、企業與管理員成功路徑的資料異動測試。正式環境未套用本版 migration。
