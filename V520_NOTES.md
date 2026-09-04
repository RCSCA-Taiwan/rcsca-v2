# V520｜自助管理生命週期

- 個人基本資料更新改走受控 RPC，並留下 Audit Log。
- 通知已讀／未讀改走受控 RPC，新增「全部標為已讀」。
- 企業新增共享改走受控 RPC，不再由前端直接 insert；尚未核准的共享可自行取消。
- 1% Network 公開節點申請改走受控 RPC；未核准節點可取消，已核准節點不能自行偷偷改回送審或下架。
- 所有上述流程保留既有 RLS 並增加 server-side ownership / enterprise membership 檢查。
- 同步修正 V430 migration 的 admin helper 相容性；Staging 曾缺少 V430 Network/Reward tables，本版已補做 schema reconciliation，避免後續功能只存在前端專案裡。
