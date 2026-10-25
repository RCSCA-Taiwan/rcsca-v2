import Link from 'next/link';
import SiteHeader from '../../SiteHeader';
const foundations=[
 ['個人與會籍','註冊驗證、入會／續會、歷年會籍認領、生日與個人資料異動／重置／刪除審核'],
 ['關懷與活動','活動主檔、參與登記、完成核實、受保護需求與公開成果'],
 ['企業與專業媒合','企業申請、每期產品／服務供應、ESG 案件、專業及人才媒合'],
 ['共享所與履約','點數與資格確認、預約、配送、取消及退點流程'],
 ['交流與貢獻','討論、圖片審核、檢舉下架、認購與實收核對'],
 ['管理營運','角色分工、待辦、稽核紀錄、通知工作器、資料申請實際執行與備份工具']
];
const checks=[
 ['正式站狀態','2026/10/25：Vercel Production READY；核心公開與受保護入口持續可載入。註冊與 Email magic-link 已主動暫停，避免 SMTP 故障影響使用者'],
 ['登入與隱私邊界','未登入時，關懷需求、企業合作需求、MY 1% 與正式會籍流程不直接輸出受保護個資欄位'],
 ['資料重置／刪除','已具備雙重確認、管理審核、實際 executor 與後台執行按鈕；只有資料處理成功後才標記完成'],
 ['歷年會員流程','匯入預覽／指紋確認、獨立認領審核、原入會日期與生日承接、重複匯入防護均已實作'],
 ['管理通知工作器','Supabase 每 5 分鐘排程；automatic 已啟用、近期 worker run completed。此項不等於 Supabase Auth 驗證信已完成真實收件驗收'],
 ['備份工具','加密備份、異地上傳、下載驗證與隔離還原流程已建置；正式 Production 異地備份仍待真實憑證配置']
];
const remaining=[
 ['Auth Email／註冊阻塞','2026/10/25 Production 實測確認 Supabase Auth SMTP 回傳 Gmail 535 BadCredentials。新註冊與 Email magic-link 已暫停；必須更換／修復正式 SMTP，完成真實收件＋點擊 callback＋登入後才可重新開放'],
 ['正式會員資料','Production 正式會員名冊、舊會員認領與生日資料目前尚未匯入真實歷史名單'],
 ['正式備份與異地保存','需配置 Production DB 密碼、備份加密金鑰與 S3 相容異地儲存憑證，取得至少一次完整成功紀錄'],
 ['細部營運規則','徽章／XP 門檻及仍未核定的回饋規則不可自行補值，需協會正式確認'],
 ['手機／桌機實機驗收','自動 browser 測試持續通過，但實際 iPhone／桌面主要流程仍需最終人工驗收'],
 ['自有正式網域','目前 Vercel 專案只有 rcsca-v2.vercel.app；若要正式對外發布，仍需決定並綁定協會自有網域'],
 ['安全與效能硬化','外洩密碼防護、SECURITY DEFINER 權限邊界、外鍵索引等 Advisor 提示需逐項核對，不以批次撤權限方式處理']
];
function Rows({items}:{items:string[][]}){return <>{items.map(([label,status])=><div className="statusRow" key={label}><span>{label}</span><strong>{status}</strong></div>)}</>}
export default function DataReadiness(){return <main className="shell"><SiteHeader/>
 <section className="pageHero compactHero"><p className="eyebrow">後台｜資料與營運準備</p><h1>核心架構已完成，正式上線仍受 Auth Email 與外部營運設定阻塞。</h1><p className="lead">更新：2026 年 10 月 25 日。此頁只以實際 Production、資料庫與真實端到端驗收紀錄為準；CI、設定存在或 worker 正常都不能替代真人收件與完成流程。</p><p><Link href="/admin/operations#workspaces">開啟完整後台工作區 →</Link>　<Link href="/guide">查看全站功能指南 →</Link></p></section>
 <section className="glassCard"><h2>已有的主要功能架構</h2><p>下列功能已有實作與入口；實際資料及可用操作仍依帳號角色、正式資料與個別審核狀態顯示。</p><Rows items={foundations}/></section>
 <section className="sectionGrid twoCol"><article className="glassCard"><h2>目前已驗證</h2><p>以下為 2026/10/25 的營運基準；CI 通過不等同於所有正式資料與實機流程都已驗收。</p><Rows items={checks}/></article><article className="glassCard"><h2>尚未關閉的正式營運缺口</h2><Rows items={remaining}/></article></section>
 <section className="glassCard"><h2>資料補入與上線原則</h2><p>歷史名單依來源核對會員身分、聯絡方式、原入會日期、會籍類型、有效年度、生日與介紹人資訊；舊會員認領恢復歷史會籍，但不會自動加入小隊或發放積分。</p><p>新會員的介紹人／所屬企業只有在來源唯一且只有一個有效小隊時才會自動帶入；無匹配、同名或多小隊情況必須人工確認，避免錯配。</p><p>共享等級、協會會籍、捐款貢獻徽章及可兌換點數各自依核定規則處理。正式備份必須有真實異地副本與隔離還原證據後才能標示完成；Auth Email 必須有真實收件、點擊與登入成功證據後才能重新開放。</p><p><Link href="/admin/members">會員與名冊管理 →</Link>　<Link href="/admin/contributions">認購與捐款核實 →</Link>　<Link href="/admin/rewards">共享所與履約管理 →</Link>　<Link href="/admin/data-requests">個人資料申請 →</Link></p></section>
 </main>}
