# 管理通知寄信與自動排程

Supabase Auth SMTP 僅用於登入與驗證信；審核通知使用獨立的伺服器 SMTP 設定與私有 outbox。正式環境目前已具備防重、稽核、重試、排程與 worker，管理員可在 `/admin/queue` 查看營運狀態。SMTP 接受交寄仍不等於收件匣實際送達；真正的收件結果仍需由管理信箱核對，系統不把 `accepted` 誤標為「已送達」。

## 私有設定

Vercel Production 使用下列私有變數：

| 變數 | 用途 |
| --- | --- |
| `RCSCA_SMTP_USER` | 經核對的寄件 Gmail 完整信箱 |
| `RCSCA_SMTP_PASSWORD` | Google 應用程式密碼，使用 Secret／Sensitive 類型 |
| `RCSCA_SMTP_HOST` | 可省略，預設 `smtp.gmail.com` |
| `RCSCA_SMTP_PORT` | 可省略，預設 `587`；亦接受 `465` |
| `RCSCA_SMTP_FROM` | 可省略，預設與 USER 相同；其他寄件信箱須有服務商授權 |
| `RCSCA_MAIL_WORKER_SECRET` | Production worker 的固定長度私密權杖，不提供瀏覽器使用 |

以上變數不可加 `NEXT_PUBLIC_` 前綴，也不可把正式憑證配置到非正式測試環境。原始憑證、收件人與 worker token 不透過管理 API 回傳。

## 連線與測試信

管理員登入 `/admin/queue`，在「官網通知信設定」可先執行「檢查寄信連線（不寄信）」。伺服器重新驗證登入及資料庫管理權限，強制 TLS，使用 Nodemailer `verify()` 驗證連線與 SMTP 帳密，不執行 `sendMail`。

「連線通過」不等於信件送達。管理員可另行按「寄送一封測試信」；收件人固定取自私有通知設定，內容固定且不含會員或個案資料。SMTP 接受後，仍須到管理信箱確認實際收到，再由管理員勾選收信確認後啟用手動或自動寄送。

## 審核通知 outbox

私有 outbox 記錄八類新送出／重新送審事件：企業加入、企業共享、Network 媒合、需求個案、公開資料變更、共享所核銷、公益參與核實及入會／續會。不補寄歷史待辦。狀態未改變不排新通知；來源離開待審狀態或刪除時，尚未交寄的通知會取消。

信件只包含待辦類別與正式後台連結，不帶姓名、聯絡資訊或個案內容。每次交寄以資料庫列鎖、lease 與獨立 attempt 紀錄避免同時取得同一筆。穩定 Message-ID 輔助人工辨識，但 SMTP 無法保證跨服務恰好一次投遞。

明確拒絕或交寄前失敗會保存固定 failure code。自動模式只重試可明確認定為失敗的通知，依序至少等待 1、5、15、60 分鐘，每封最多五次。DATA 後逾時、中斷、結果落庫不明或 lease 逾時會保留為 `unknown`，不自動重寄；管理員必須先核對信箱，再自行決定是否重試。

## Production 自動排程

正式環境使用 Supabase `pg_cron` 每五分鐘呼叫 `private.trigger_admin_mail_automatic_tick()`；tick 再透過 `pg_net` 呼叫 Production `/api/internal/admin-mail/run`。worker token 以 Vault／hash 驗證，不直接寫入 cron command。每輪最多取得三封，資料庫負責 pause、lease、backoff 與 attempt 上限；Vercel worker 不使用記憶體 timer 或自我遞迴。

`/admin/queue` 顯示最近排程 tick、worker 回報、最近一輪、各 outbox 狀態筆數，以及最近 SMTP 接受交寄時間。健康狀態分為：

- `healthy`：自動寄送已啟用，排程與 worker 在 15 分鐘內均有回報，且沒有結果不明／已達重試上限通知。
- `scheduler_stale`：排程超過 15 分鐘沒有 tick，需查 Supabase `pg_cron`／`pg_net`。
- `worker_stale`：排程仍有 tick，但 worker 超過 15 分鐘未回報，需查 Vercel Production worker。
- `attention`：自動流程仍在線，但存在 `unknown` 或已達五次重試上限的通知，需人工核對。
- `not_ready`：scheduler／worker token 尚未完成必要設定。
- `paused`：自動寄送由管理員暫停。

健康 API 只回傳衍生營運資訊，不包含 SMTP 密碼、worker token、Vault secret ID 或私有收件地址。

## 送達界線

目前能可靠驗收的是：排程有 tick、worker 有回報、SMTP 是否接受交寄、失敗／結果不明是否持久化、重試是否受限。SMTP `accepted` 不是收件匣送達證明；若未來需要自動處理退信或最終投遞狀態，必須改用具有 webhook／delivery event 的郵件服務商並另建事件驗證流程，不能用 SMTP accepted 冒充送達。
