# RCSCA V2 Platform V130

V130 將登入後的個人端從「讀資料」推進到第一批真正可寫入 Staging 的安全流程。

## 本版完成
- 個人基本資料可自行更新：只開放顯示名稱、手機、語系等低風險欄位；會籍、等級、XP、共享點、管理權限不能自行修改。
- 「我的共享紀錄」改為讀取真實 `sharing_footprints`。
- 「我的需求與進度」改為讀取真實 `network_requests`。
- 生活找人／專業媒合需求可由已登入使用者直接寫入 Staging，且只能建立自己的需求。
- 公益行動參與可由已登入使用者直接登記；狀態固定從 `pending` 開始，不能自行核實。
- 新增 migration `0006_self_service_authenticated_writes.sql`，與 Staging 已部署規則一致。

## 還刻意沒有開放
- 使用者不能自行增加 XP 或共享點。
- 使用者不能自行成為 RCSCA MEMBER。
- 使用者不能自行建立管理者身份。
- 使用者不能自行把活動參與改為已核實。
- 企業核准、企業年度標章與個案限制資料仍由後台流程控制。

## 部署前仍需設定
Vercel Environment Variables：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Supabase Auth URL Configuration 也需要加入 Vercel 正式／預覽站的 `/auth/callback` 允許網址，Magic Link 才能完整回站。
