# RCSCA V2｜資料狀態模型 V90

這份文件把 V80 前端流程收斂成未來資料庫可直接採用的狀態語言。目的不是現在就寫死 Supabase，而是避免接資料庫後才發現每個頁面用不同詞描述同一件事。

## 1. 共用 Request 狀態
`draft → submitted → under_review → needs_info → approved → matched → completed`

另有終止狀態：`rejected / cancelled`。

前台中文固定：草稿／已送出／審核中／待補資料／已核准／已媒合／已完成／未通過／已取消。

## 2. 活動參與核實
`unverified → pending → verified`，必要時 `rejected`。

- 核實對象是「是否完成參與」。
- 現金、轉帳、現場服務等只是 participation_type。
- 認購金額屬財務資料，不決定共享點、XP 或 Level。
- `verified` 後才建立 sharing_footprint 與 XP transaction。

## 3. 身份、等級、權限分離
- Identity：一般參觀者／共享夥伴／RCSCA MEMBER／企業／管理角色。
- Level：參與歷程，不等同會籍。
- Permission：由角色與資料敏感度決定，不因 Level 高而自動取得。

## 4. 企業共享分流
企業提供內容先分：CARE 公益、Connection 資源連結、Benefit 會員禮遇、Job 工作機會、Professional 專業、Resource 其他資源。

企業指定公益資源不可自動轉入共享所；會員禮遇亦不等同公益成果。

## 5. 可見範圍
- public_summary：可公開摘要。
- member_only：登入後、符合身份才可看。
- restricted：個案、未公開企業合作或敏感資料，只限必要管理角色。
