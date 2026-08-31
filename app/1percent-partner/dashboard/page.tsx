'use client';
import SiteHeader from '../../SiteHeader';
import Link from 'next/link';

const shares=[
 ['公益行動','2026 中秋物資認購','已完成','物資與員工參與'],
 ['資源連結','提供 2 個友善職缺','媒合中','工作機會'],
 ['會員禮遇','Q4 平日服務禮遇','審核中','服務共享']
];
export default function PartnerDashboard(){return <main className="partnerDashboard"><SiteHeader/>
<section className="flowHero"><div className="portalWrap"><div className="eyebrow">企業管理入口</div><h1>企業的共享，不只留下一張標章。</h1><p>這裡整理合作需求、共享紀錄、影響力成果、Network 節點與審核狀態。示意資料之後會改由企業帳號登入後取得。</p></div></section>
<section className="portalSection"><div className="portalWrap">
 <div className="partnerSummary"><article><small>企業身份</small><strong>1% 企業共享夥伴</strong><span>共享階段 2 · 持續共享夥伴</span></article><article><small>本年度已核實共享</small><strong>3</strong><span>公益／連結／禮遇分流記錄</span></article><article><small>Network 節點</small><strong>室內設計</strong><span>新北 · 目前 3 家夥伴</span></article><article><small>待處理</small><strong>2</strong><span>媒合 1 · 審核 1</span></article></div>
 <div className="sectionHead"><div><div className="eyebrow">本年度共享紀錄</div><h2>每一筆都知道流向哪裡。</h2></div><p>不以贊助金額排序。公開成果與企業內部合作資料也會分開。</p></div>
 <div className="enterpriseLedger"><div className="elHead"><span>類型</span><span>內容</span><span>狀態</span><span>共享形式</span></div>{shares.map(r=><div className="elRow" key={r[1]}>{r.map(c=><span key={c}>{c}</span>)}</div>)}</div>
 <div className="portalGrid three dashboardLinks"><article><h3>企業合作需求</h3><p>查看 ESG／公益／員工參與等需求目前進度。</p><Link href="/1percent-partner/requests">查看合作進度 →</Link></article><article><h3>影響力成果</h3><p>整理年度行動、參與人次與可使用成果素材。</p><Link href="/1percent-partner/impact">查看成果 →</Link></article><article><h3>Network 媒合</h3><p>查看企業目前正在尋找或提供的專業與資源。</p><Link href="/1percent-network/matches">查看媒合 →</Link></article></div>
</div></section></main>}
