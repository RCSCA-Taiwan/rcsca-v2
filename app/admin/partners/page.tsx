import AdminPageIntro from '../AdminPageIntro';import SiteHeader from '../../SiteHeader';
import LiveAdminPartners from './LiveAdminPartners';
import LiveEnterpriseApplications from './LiveEnterpriseApplications';
import LiveBadgeManager from './LiveBadgeManager';
export default function AdminPartners(){return <main className="adminPage"><SiteHeader/><section className="flowHero"><div className="portalWrap"><div className="eyebrow">企業共享審核</div><h1>先確認用途，再決定它進哪一條共享路徑。</h1><p>企業送出的 1% 不會自行公開。公益資源、共享所、會員禮遇、工作機會與一般企業合作分流處理。</p></div></section><section className="portalSection"><div className="portalWrap"><LiveEnterpriseApplications/><LiveAdminPartners/><LiveBadgeManager/><div className="privacyCallout"><strong>年度標章不是付款取得。</strong><p>企業完成經 RCSCA 核實的實質共享後，才具備相應年度共享紀錄；贊助金額不作前台排序與等級依據。</p></div></div></section></main>}
