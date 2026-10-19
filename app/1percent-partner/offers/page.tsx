import PartnerWorkspaceNav from '../../components/PartnerWorkspaceNav';
import SiteHeader from '../../SiteHeader';
import PartnerOffers from './PartnerOffers';
import '../../partner-offers.css';
export default function OffersPage(){return <main><SiteHeader/><section className="flowHero"><div className="portalWrap"><div className="eyebrow">1% PARTNER · 本期共享</div><h1>我的每期供應</h1><p>把這一期願意分享的產品或服務送交審核。下一期可以複製，上一期的訂單與內容會保留。</p><a className="textRoute" href="/1percent-partner/dashboard">返回合作夥伴工作台 →</a></div></section><section className="portalSection"><div className="portalWrap"><PartnerWorkspaceNav/><PartnerOffers/></div></section></main>}
