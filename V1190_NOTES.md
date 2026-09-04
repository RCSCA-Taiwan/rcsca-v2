# V1190 Notes

- 在 Staging 修復 `decide_network_response(uuid,text)`。
- 限制需求方、回應方各自可執行的決策。
- 限制合法狀態轉換，避免已完成、已拒絕或已取消流程被任意覆寫。
- 撤銷 `public` 與 `anon` 執行權限。
- 保留狀態異動稽核與對方通知。
- 同步 Staging TypeScript schema，發現下一個缺口 `submit_enterprise_application`。
- 正式環境未變更。
