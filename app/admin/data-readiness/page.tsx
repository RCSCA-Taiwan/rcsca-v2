import SiteHeader from "../../SiteHeader";

const checks = [
  ["核心資料結構", "已建立"],
  ["RLS 權限邊界", "已建立"],
  ["登入建立個人資料", "已啟用"],
  ["活動完成核實", "受控流程"],
  ["個案敏感資料", "限制存取"],
  ["會員／企業歷史資料", "匯入前需清洗與驗證"],
  ["財務／金額", "與 XP、共享點及等級分離"],
  ["RPC 完整性", "前端 52／52 個 RPC 已於 Staging 對齊"],
  ["高權限 RPC 攻擊面", "前端 52／52；額外對外函式 0"],
  ["匿名高權限函式", "Advisor 警告 0"],
  ["外鍵索引／RLS 效能", "結構性警告 0"],
  ["重疊 RLS Policy", "Advisor 警告 0"],
  ["越權拒絕測試", "12 個管理 RPC 與 9 個敏感資料面通過"],
  ["View 資料邊界", "13／13 security_invoker；內部 View 匿名權限 0"],
  ["Migration 基線", "Staging 65／65 原始 SQL 已完整封存"],
  ["Schema Contract", "10／10 結構與權限指紋通過"],
  ["直接資料表寫入", "前端 0；anon／authenticated DML grants 0"],
  ["角色正向測試", "會員／案件／企業／管理 7／7 通過"],
  ["管理狀態轉換", "成果／ESG／企業案件／Network／標章 9／9 通過"],
  ["舊通知表引用", "函式引用 0"],
  ["未登入路由防護", "帳戶／後台／企業私有入口均導回登入"],
  ["Session Cookie 快取防護", "刷新回應自動禁止 CDN 快取"],
  ["登入 E2E 驗證器", "登入／Profile／私有路由／登出流程已就緒"],
  ["前端依賴漏洞", "Production audit 0"],
  ["Data API 匿名邊界", "公開摘要可讀；敏感列舉與寫入受阻"],
];
const rpcBlockers = [
  "成果草稿建立",
  "善循環案例發布",
  "ESG 素材核准",
  "ESG 報告開放／暫緩",
  "企業案件到期提醒",
  "企業案件狀態更新",
  "Network 媒合狀態決策",
];
export default function DataReadiness() {
  return (
    <main className="shell">
      <SiteHeader />
      <section className="pageHero compactHero">
        <p className="eyebrow">後台｜資料治理</p>
        <h1>真實資料進入系統前，先確認來源、權限與用途。</h1>
        <p className="lead">
          會員、企業、活動與受保護個案採不同資料邊界；歷史資料匯入前必須完成清洗、去重與必要驗證。
        </p>
      </section>
      <section className="sectionGrid twoCol">
        <article className="glassCard">
          <h2>資料層檢查</h2>
          {checks.map(([a, b]) => (
            <div className="statusRow" key={a}>
              <span>{a}</span>
              <strong>{b}</strong>
            </div>
          ))}
        </article>
        <article className="glassCard">
          <h2>匯入原則</h2>
          <p>
            不把舊名單直接視為有效會員資料。身份、聯絡方式、企業關係與歷史參與紀錄應依來源逐批核對。
          </p>
          <p>
            特殊保護個案與敏感需求資料維持限制層，不因資料匯入而轉成公開內容。
          </p>
        </article>
      </section>
      <section className="glassCard">
        <p className="eyebrow">上線驗證</p>
        <h2>前端使用的 RPC 已全部對齊 Staging，待角色正向測試。</h2>
        <p>
          Migration、函式簽章、匿名權限防護及資料邊界已完成驗證。目前 Staging
          已以可回滾測試帳號完成首批會員、案件、企業與管理成功路徑；正式環境尚未套用。
        </p>
        <div className="statusGrid">
          {rpcBlockers.map((item) => (
            <div className="statusRow" key={item}>
              <span>{item}</span>
              <strong>Staging 已建立</strong>
            </div>
          ))}
        </div>
        <p>首批角色正向測試 7／7 通過且測試資料完整回滾；其餘管理審核鏈與正式環境變更核准完成前，不標記為正式可用。</p>
        <p>資料庫型別已接入前端；後續函式、欄位或參數漂移會在建置階段直接報錯。</p>
        <p>52 個 authenticated 高權限 endpoint 與前端實際使用的 52 個 RPC 完全一致；6 個內部或舊函式已撤銷外部執行權限。</p>
        <p>前端資料異動全部經由已審核 RPC；anon 與 authenticated 對 public tables 的直接新增、修改及刪除權限已撤銷。</p>
        <p>成果草稿、案例發布、ESG 核准、企業案件、Network 審核及企業標章等管理狀態轉換已完成 9／9 回滾式正向測試。</p>
        <p>SSR session gateway 已覆蓋帳戶、後台、MY 1%、企業私有入口與會員需求頁；未登入請求會保留安全的站內返回路徑並導向登入。</p>
        <p>Supabase SSR 已升級並鎖定版本；任何刷新 Auth Cookie 的回應會同步套用禁止快取標頭，避免 CDN 誤快取使用者 Session。公開且未寫入 Cookie 的頁面仍可正常快取。</p>
        <p>登入 E2E 驗證器已涵蓋密碼登入、伺服器驗證使用者、Profile 所有權、私有頁面 Cookie 與登出導向；待放入可拋棄 Staging 帳號及可連線 preview URL 即可執行。</p>
        <p>Production dependency audit 已降至 0 個已知漏洞；Next.js 15 維持原主版本，未以高風險的強制大版本升級處理。</p>
        <p>公開首頁只保留彙總影響力統計；企業、ESG 與管理報表已撤銷匿名權限，無企業關係的登入者也無法列舉企業摘要。</p>
        <p>Staging migration history 的 65／65 份原始 SQL 已依原始版本號完整封存，並以位元組數與 MD5 驗證；下一步只剩在隔離的空白資料庫實際 replay。</p>
      </section>
    </main>
  );
}
