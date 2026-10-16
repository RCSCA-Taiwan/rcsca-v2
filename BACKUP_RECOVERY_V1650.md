# V1650 備份與還原準備

## 目前狀態（2026-10-16）

正式資料庫盤點約 16 MB、49 張 public/private 應用表。community-media 為私人儲存區，目前物件數為 0。此盤點不是備份，也不代表未來沒有圖片。

本輪已交付加密匯出與驗證工具，**尚未建立實際正式資料備份、尚未完成異地複本、尚未完成還原演練**。目前執行環境沒有 PostgreSQL 用戶端、專案資料庫連線憑證及備份加密金鑰。僅具資料查詢權不能冒稱已取得備份檔，也不能推斷平台備份保留天數或付費方案。

## 保護範圍

| 項目 | 工具處理方式 | 限制 |
| --- | --- | --- |
| 應用、私有申請、積分與審核資料 | PostgreSQL 一致性邏輯快照，包含非系統 schema | 須有讀取全部必要資料的可信資料庫帳號；還原需符合 Supabase 管理 schema 的處理方式 |
| 登入帳號 | 同份資料庫匯出中的 auth schema | 含敏感認證資料，加密檔及解密金鑰需分開保管 |
| 圖片與上傳檔案 | 逐一取得原物件，直接串流加密；保存加密後的物件對照表 | 圖片不是資料庫備份的一部分；前後物件清單異動即拒絕標記完成 |
| 程式碼與資料庫遷移 | GitHub 版本記錄 | 不替代使用者資料備份 |
| 平台設定、外部金鑰、角色密碼 | 本工具不備份 | 由協會的密碼管理工具及平台管理程序另行保存 |

不把明文資料庫、圖片或金鑰寫入原始碼庫、網站公開目錄或 GitHub Actions 產物。工具只會寫入操作者指定、位於原始碼庫外的目錄。加密採 AES-256-GCM，每個檔案使用獨立隨機 nonce。加密金鑰不得與備份檔放在同一位置。

## 操作環境

在協會控制的備份主機安裝 Node.js 22+、PostgreSQL 17+ 的 pg_dump、pg_restore、psql。用可信的作業系統憑證管理／服務設定注入下列環境變數，不把值貼在聊天、命令列參數、GitHub 或文件中。

| 環境變數 | 用途 |
| --- | --- |
| PGHOST、PGPORT、PGDATABASE、PGUSER | 選定專案的直接連線或 session pooler；5432、postgres 資料庫；工具會核對專案 |
| PGPASSWORD 或 PGPASSFILE | 資料庫密碼，或權限受保護的 pgpass 檔案 |
| PGSSLROOTCERT（如需要） | 受信任憑證鏈；工具固定要求 verify-full，不接受關閉 TLS 驗證 |
| RCSCA_BACKUP_PROJECT_REF | 明確指定正式或測試專案，避免跨專案誤備份 |
| RCSCA_BACKUP_DIRECTORY | 原始碼庫之外、由協會管理的絕對路徑 |
| RCSCA_BACKUP_KEY | 安全產生的 32-byte 隨機金鑰，以標準 Base64 編碼；須另外保存以供解密 |
| RCSCA_BACKUP_STORAGE_KEY | 僅在有圖片／檔案時需要；具讀取全部備份物件權限的伺服器端金鑰，不得使用 NEXT_PUBLIC 前綴 |

先執行 `npm run backup:check`。此命令只回報工具和設定是否存在，不顯示密碼或金鑰，也不代表連線及權限已驗證。

設定完成後執行 `npm run backup:create`。工具會讀取儲存清單、加密資料庫匯出與每個物件，再次比對清單，驗證 GCM 認證、SHA-256、檔案大小、數量及 pg_restore 目錄，全部通過才寫入 COMPLETE.json。任一步失敗的目錄都是未完成備份，不能作為已成功保護的依據。

執行 `npm run backup:verify -- /absolute/backup-directory` 重新驗證所有加密檔、清單及完成標記。這項驗證不是還原演練，不會解密資料至磁碟，也不會連線寫入任何資料庫。工具只建立本機檔案，不會上傳異地、不會自動排程、不會刪除既有備份。

把整個完成目錄複製到協會授權的異地儲存後，使用獨立取回的複本再次執行驗證；記錄成功時間、原始碼 commit、資料庫遷移版本與驗證結果。需先決定備份頻率、保留期限、異地位置及保管人，才能把流程設成排程。

## 還原演練與真正故障時的操作

1. 先在獨立測試環境演練；正式環境復原會造成停機及新資料損失，不能用「回到舊版網站」代替資料還原。
2. 選定故障前的完整備份，取回異地副本和獨立保管的金鑰，先執行完整性驗證。
3. 由受權維運人員依 [Supabase 官方備份／還原程序](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) 規劃相容的目標專案、PostgreSQL 版本、擴充套件、角色與 managed auth/storage schema；本工具產生的是原生 custom-format 邏輯匯出，不能直接對運作中的 Supabase 專案盲目 pg_restore，也不是平台一鍵還原檔。
4. 對驗證過的檔案解密時只放在受控記憶體或私有臨時環境。先確認資料與 schema 的還原順序、外鍵、登入觸發器和存取權限；本工具刻意不提供寫入正式庫的自動還原命令。
5. 按加密 manifest 的 bucket_id/name 對照恢復圖片本體與 metadata。儲存物件 API 的寫入可能更新 metadata，需在測試環境確認結果，不可只還原 storage.objects 表就宣稱圖片恢復。
6. 核對會員數、積分交易與餘額、取消退款防重、兌換庫存、私有資料權限、圖片可用性與登入；核對成功才記錄演練完成。不要以「加密檔可解開」代替實際演練。
7. 真正故障時先保全目前狀態及審核軌跡，由協會確認復原時間點及影響範圍後才操作正式環境。

平台備份的保留範圍和可還原時間點須實際查看 [正式專案備份頁](https://supabase.com/dashboard/project/zoogppmgajbiridffohm/database/backups/scheduled)。[Supabase 官方文件](https://supabase.com/docs/guides/platform/backups) 明確說明資料庫備份不含 Storage 檔案本體；本輪沒有核實此帳號的自動備份狀態。
