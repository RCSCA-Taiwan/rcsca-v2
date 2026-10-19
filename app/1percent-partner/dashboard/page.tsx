'use client';
import PartnerWorkspaceNav from '../../components/PartnerWorkspaceNav';
import SiteHeader from '../../SiteHeader';
import Link from 'next/link';
import LivePartnerDashboard from './LivePartnerDashboard';
import LivePartnerBadge from './LivePartnerBadge';
import {useI18n} from '../../i18n';
export default function PartnerDashboard(){const {t}=useI18n();return <main className="partnerDashboard"><SiteHeader/>
<section className="flowHero"><div className="portalWrap"><div className="eyebrow">{t('partner.dashboard')}</div><h1>{t('partner.dashboardTitle')}</h1><p>{t('partner.dashboardLead')}</p></div></section>
<section className="portalSection"><div className="portalWrap"><PartnerWorkspaceNav/><div className="privacyCallout"><h2>管理本期產品與服務</h2><p>新增每月／每期供應、上傳圖片、補件與申請下架。</p><a className="textRoute" href="/1percent-partner/offers">我的每期供應 →</a> · <a className="textRoute" href="/account/fulfillment">預約／配送履約工作台 →</a></div><LivePartnerDashboard/><div className="portalWrap dashboardUtility"><a className="textRoute" href="/1percent-partner/team">{t('partner.team')}</a></div><LivePartnerBadge/><div className="portalGrid three dashboardLinks"><article><h3>{t('partner.requests')}</h3><p>查看 ESG、公益、員工參與等需求目前進度。</p><Link href="/1percent-partner/requests">查看合作進度 →</Link></article><article><h3>{t('partner.impact')}</h3><p>整理年度行動、參與人次與可使用成果素材。</p><Link href="/1percent-partner/impact">查看成果 →</Link></article><article><h3>{t('partner.match')}</h3><p>查看企業目前正在尋找或提供的專業與資源。</p><Link href="/1percent-network/matches">查看媒合 →</Link></article></div></div></section></main>}
