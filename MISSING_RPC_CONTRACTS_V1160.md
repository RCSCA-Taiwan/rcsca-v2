# 缺失管理 RPC 合約規格（v1160）

本文件只定義需求，不建立或修改資料庫函式。

## 共通安全要求

- 僅允許 authenticated 呼叫，函式內再次驗證指定管理角色。
- 使用 security definer 時固定 search_path=public。
- 驗證目標資料存在、目前狀態與允許的狀態轉換。
- 業務變更、通知與 audit_logs 寫入必須在同一交易完成。
- 重複呼叫不得產生重複草稿、通知或稽核事件。
- 拒絕時回傳穩定錯誤，不暴露 SQL、內部資料或敏感欄位。

## admin_generate_outcome_drafts

- 輸入：p_queue_id uuid
- 角色：outcome_reviewer 或 super_admin
- 前置：佇列存在且尚未建立草稿。
- 結果：依建議建立善循環案例及／或 ESG 素材草稿，佇列轉為審核中。
- 稽核：generate_outcome_drafts，對象 outcome_review_queue。

## admin_publish_cycle_story

- 輸入：案例 ID、標題、摘要、同意確認、匿名化、備註。
- 角色：outcome_reviewer 或 super_admin
- 前置：同意必須為真；標題與摘要不可空白。
- 結果：案例轉為已發布；保存同意與匿名化決定。
- 稽核：publish_cycle_story，不得在備註保存受助者敏感資料。

## admin_approve_esg_asset

- 輸入：素材 ID、標題、摘要、期間、備註。
- 角色：outcome_reviewer 或 super_admin
- 前置：素材為草稿、已送出或待補資料。
- 結果：素材轉為核准，但不等同 report_ready。
- 稽核：approve_esg_asset。

## admin_set_esg_evidence_review

- 輸入：素材 ID、report_ready boolean、備註。
- 角色：outcome_reviewer 或 super_admin
- 開放前置：素材已核准、匯出品質通過、來源已核實。
- 結果：只更新報告交付狀態，不修改來源證據。
- 稽核：開放與暫緩使用不同 action。

## admin_mark_case_due_reminder

- 輸入：p_request_id uuid
- 角色：enterprise_reviewer、admin 或 super_admin
- 前置：案件存在且目前為逾期／待提醒。
- 結果：記錄本次提醒已處理；重複呼叫不可重複通知。
- 稽核：mark_case_due_reminder。

## admin_update_enterprise_service_request

- 輸入：案件 ID、狀態、承辦人、說明、下一步、到期日、企業可見性。
- 角色：enterprise_reviewer、admin 或 super_admin
- 前置：狀態轉換合法；承辦人具有對應管理角色。
- 結果：更新案件、建立歷程；企業可見說明與內部資訊分離。
- 稽核：記錄前後狀態、承辦人及是否對企業可見。

## 驗收門檻

每個 RPC 必須通過：正確角色、錯誤角色、匿名、資料不存在、非法狀態、重複提交、交易失敗回滾及稽核紀錄八類測試。
