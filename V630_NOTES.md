# V630 — 正式站路由／搜尋引擎邊界／死碼清理

- 新增 sitemap 與 robots，公開內容可被索引，帳號、後台、會員深層 Network 與企業管理頁禁止搜尋引擎索引。
- 新增正式 404 頁，避免錯誤網址落入 Next.js 預設畫面。
- 清除已不再使用的 mockData 與舊 staging readiness 模組。
- 成果整理後台補回全站 SiteHeader，後台導覽一致。
- 全站靜態路由引用掃描：0 個缺失。
- npm build 嘗試因工作環境無 node_modules 且安裝逾時，未把它誤判為程式 Build 通過；完整 Build 驗證留在 QA 階段。
