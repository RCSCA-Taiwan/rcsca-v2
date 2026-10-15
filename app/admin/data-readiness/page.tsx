import SiteHeader from "../../SiteHeader";

// Dated evidence, not a live monitoring feed or an assertion about later releases.
const checks = [
  ["資料庫重建", "88 份遷移已於隔離環境重播通過"],
  ["正式／Staging 核對", "75 個函式定義與權限及 public RLS 政策已核對"],
  ["瀏覽器流程", "V1550：29 項通過，1 項裝置不適用略過"],
  ["角色與狀態流程", "登入登出、企業審核、ESG、活動登記及工作意願已驗證"],
  ["測試資料", "認證測試使用隔離環境與臨時帳號"],
  ["案例公開", "須具備公開同意並經核准"],
  ["正式名單", "匯入前仍須清洗、去重及核對身份與用途"],
];
const remaining = [
  ["正式資料匯入", "依協會確認的名單與公開同意逐批處理"],
  ["外洩密碼防護", "尚未啟用；須完成方案及帳號設定確認"],
  ["手機實機驗收", "自動測試已涵蓋手機；實機驗收仍須完成"],
  ["安全檢查", "仍有高權限函式等 Advisor 提醒；不可視為零風險"],
];
const additions = [
  ["共享點規則", "V1570 加入會員兌換資格檢查；計分比例與捐款回饋待核定"],
  ["捐款貢獻", "後台核實匯入、共享點與獨立貢獻徽章；比例與門檻待核定"],
  ["企業產品／服務", "必要供給方案、協會審核、點數與有效期限設定待擴充"],
  ["兌換與履約", "總表、點數預覽、預約保留、配送與取消退點待擴充"],
  ["交流與圖片", "主題討論、權限、圖片上傳與內容管理待建置"],
];
function Rows({ items }: { items: string[][] }) {
  return <>{items.map(([label, status]) => (
    <div className="statusRow" key={label}><span>{label}</span><strong>{status}</strong></div>
  ))}</>;
}
export default function DataReadiness() {
  return (
    <main className="shell">
      <SiteHeader />
      <section className="pageHero compactHero">
        <p className="eyebrow">後台｜資料治理</p>
        <h1>資料準備與驗證紀錄</h1>
        <p className="lead">驗證快照：2026 年 10 月 15 日，V1550。此頁記錄已完成的檢查與待辦，不代表即時服務狀態或整站最終驗收完成。</p>
      </section>
      <section className="sectionGrid twoCol">
        <article className="glassCard"><h2>已完成的驗證</h2><Rows items={checks} /></article>
        <article className="glassCard"><h2>正式營運前待辦</h2><Rows items={remaining} /></article>
      </section>
      <section className="glassCard">
        <h2>新增需求：尚未全部實作</h2>
        <p>已有共享所目錄、點數紀錄與兌換審核基礎；以下擴充必須完成實作及測試後，才能標示可用。</p>
        <Rows items={additions} />
      </section>
      <section className="glassCard">
        <h2>資料匯入與維護原則</h2>
        <p>舊名單不直接視為有效會員。身份、聯絡方式、企業關係及歷史參與依來源核對；敏感個案資料不因匯入而公開。</p>
        <p>共享等級、協會會籍、捐款貢獻徽章及可兌換點數分別管理。新增規則不會自動套用既有紀錄，必須明確定義生效方式。</p>
        <p>容量與費用目前僅保存估算，尚未升級付費方案。資料庫與上傳檔案應分別規劃備份與還原驗證。</p>
        <p><a href="/admin/contributions">捐款核實與徽章規則 →</a>　<a href="/admin/community">交流圖片審核 →</a>　<a href="/admin/rewards">管理現有共享所目錄與兌換申請 →</a></p>
      </section>
    </main>
  );
}
