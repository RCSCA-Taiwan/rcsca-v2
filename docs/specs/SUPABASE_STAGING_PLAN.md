# RCSCA V2｜Supabase 測試環境接軌計畫

## 這一版完成什麼

V100 先完成「資料庫可施工層」，不碰真實會員資料，也不要求立刻建立正式 Supabase。

已建立：

1. Core schema migration
2. Row Level Security baseline
3. Auth → profile trigger
4. 活動完成核實的 trusted server function 範例
5. Staging-only seed
6. 前端環境狀態頁

## 固定原則

- 金額不進 XP／共享點邏輯。
- 活動完成核實只確認「是否完成參與」。
- 一般／永久會員前台都只顯示 RCSCA MEMBER。
- 身份、會籍、共享等級、權限分開。
- support_cases 是高敏感資料，不做公開名單。
- point/xp/audit 不允許一般 client 直接新增。
- 一統編一企業；可有多位授權企業管理者。
- 介紹人歷史與目前小隊分開。

## 真正建立 Supabase 後的執行順序

1. 建立 staging project，不用正式會員資料。
2. 設定 Auth 網址與測試 OTP provider。
3. 依序執行 0001 → 0004 migrations。
4. 只在 staging 執行 seed_staging.sql。
5. 用測試帳號驗證 Visitor / 共享夥伴 / MEMBER / Enterprise / Admin。
6. 驗證 RLS：直接呼叫 API 也不能越權。
7. 驗證活動核實：一次有效參與只能建立一筆 footprint。
8. 完成後才建立 production project。

## 暫不做

- 不把真實身分證號放進 staging。
- 不匯入真實 PASS IT ON／個案敘述。
- 不將 SUPABASE_SERVICE_ROLE_KEY 放進瀏覽器端。
- 不在流程未定稿前建立財務表。
