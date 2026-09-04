# RCSCA V2 · V530

## 本輪主題：已核准資料維護生命週期 + 受控提交 RPC 收斂

### 已完成
- 新增 `record_change_requests`，讓已核准的 1% Network 節點與企業共享可以提出「修改／下架」申請，而不是直接覆寫公開資料。
- 新增後台 `/admin/change-requests`，管理端可核准、要求補件或拒絕變更申請；核准後才套用到正式公開資料。
- 1% Network 加入頁新增已核准節點的「申請修改／申請下架」。
- 企業 Dashboard 新增已核准共享的「申請修改／申請停止公開」。
- 後台統一 Queue 納入公開資料變更申請。
- Network 媒合回應改走 `network_submit_response` RPC。
- 共享所兌換申請改走 `reward_submit_redemption` RPC，伺服器重新核對點數、等級、足跡、庫存與重複申請。
- 公益活動登記改走 `activity_register_participation` RPC，只有公開／進行中活動可登記。
- ESG 合作案件建立改走 `enterprise_submit_service_request` RPC，不再由前端直接 insert。
- 所有新增受控流程補上 Audit Log。

### 原則
- 已核准／公開資料不可由擁有者直接覆寫。
- 修改申請審核期間，舊的核准版本繼續有效。
- 下架也要留下可追溯的管理紀錄。
