import Link from 'next/link';
import SiteHeader from '../../SiteHeader';
const foundations=[
 ['個人與會籍','註冊驗證、入會／續會、歷年會籍認領、生日與個人資料異動'],
 ['關懷與活動','活動主檔、參與登記、完成核實、受保護需求與公開成果'],
 ['企業與專業媒合','企業申請、每期產品／服務供應、ESG 案件、專業及人才媒合'],
 ['共享所與履約','點數與資格確認、預約、配送、取消及退點流程'],
 ['交流與貢獻','討論、圖片審核、檢舉下架、認購與實收核對'],
 ['管理營運','角色分工、待辦、稽核紀錄、通知測試及自動寄送設定']
];
const checks=[
 ['資料庫重建','2026/10/19：113 份遷移在隔離環境重播通過'],
 ['登入後瀏覽器流程','2026/10/19：88 項手機／桌面測試通過'],
 ['歷年會員資料','已驗證原入會日期保留、獨立認領審核與重複匯入防護'],
 ['備份工具','合成資料的加密備份還原演練已通過；正式資料復原另行驗收'],
 ['通知寄送','已確認測試信實際收件及自動工作器連線；每筆交寄結果見待辦頁']
];
const remaining=[
 ['資料與素材後補','依協會確認的會員、活動、企業與案例資料逐批補入；不阻擋架構整理'],
 ['細部營運規則','貢獻回饋比例、徽章門檻與第三方定期扣款仍待核定'],
 ['正式備份與異地保存','需確認受控執行位置、金鑰管理、保存位置及正式復原驗收'],
 ['手機實機驗收','自動測試已涵蓋手機尺寸；iPhone 實機流程仍需驗收'],
 ['安全與方案設定','外洩密碼防護及既有高權限函式檢查仍需處理']
];
function Rows({items}:{items:string[][]}){return <>{items.map(([label,status])=><div className="statusRow" key={label}><span>{label}</span><strong>{status}</strong></div>)}</>}
export default function DataReadiness(){return <main className="shell"><SiteHeader/>
 <section className="pageHero compactHero"><p className="eyebrow">後台｜資料與營運準備</p><h1>先完成架構，再逐步補齊營運內容。</h1><p className="lead">更新：2026 年 10 月 19 日。依協會目前安排，先補齊主要入口與操作流程，名冊、素材與細部規則後補。</p><p><Link href="/admin/operations#workspaces">開啟完整後台工作區 →</Link>　<Link href="/guide">查看全站功能指南 →</Link></p></section>
 <section className="glassCard"><h2>已有的主要功能架構</h2><p>下列功能已有實作與入口；實際資料及可用操作仍依帳號角色與個別審核狀態顯示。</p><Rows items={foundations}/></section>
 <section className="sectionGrid twoCol"><article className="glassCard"><h2>已完成的驗證紀錄</h2><p>以下為標示日期的驗證結果，並非即時監控。後續版本以對應發布及驗收記錄為準。</p><Rows items={checks}/></article><article className="glassCard"><h2>後續補齊與正式營運驗收</h2><Rows items={remaining}/></article></section>
 <section className="glassCard"><h2>資料補入原則</h2><p>歷史名單依來源核對會員身分、聯絡方式、原入會日期及有效年度；生日祝賀依本人意願，個案與私人聯絡資料依權限保護。</p><p>共享等級、協會會籍、捐款貢獻徽章及可兌換點數各自依核定規則處理。正式資料備份與上傳檔案保存另行驗收。</p><p><Link href="/admin/members">會員與名冊管理 →</Link>　<Link href="/admin/contributions">認購與捐款核實 →</Link>　<Link href="/admin/rewards">共享所與履約管理 →</Link></p></section>
 </main>}
