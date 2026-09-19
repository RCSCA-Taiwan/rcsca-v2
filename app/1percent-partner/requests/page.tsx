import SiteHeader from '../../SiteHeader';
import LiveServiceRequests from './LiveServiceRequests';

export default function EnterpriseRequests(){return <main className="statePage"><SiteHeader/><section className="flowHero"><div className="portalWrap"><div className="eyebrow">企業合作進度</div><h1>每一個合作需求，都知道下一步。</h1><p>ESG 專案、資源媒合、會員禮遇與其他 1% 共享，以相同狀態規則追蹤；不必靠 Email 來回猜進度。</p></div></section><section className="portalSection"><div className="portalWrap"><LiveServiceRequests/><div className="privacyCallout"><strong>合作資料分層。</strong><p>公開成果、企業內部需求、尚未公開的 ESG 規劃與敏感合作資料不會混在同一層權限。</p></div></div></section></main>}
