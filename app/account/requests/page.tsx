import SiteHeader from '../../SiteHeader';
import LiveRequests from './LiveRequests';
export default function MyRequests(){return <main className="statePage"><SiteHeader/><section className="flowHero"><div className="portalWrap"><div className="eyebrow">我的進度</div><h1>提出之後，不需要猜現在到哪一步。</h1><p>生活找人、工作與其他共享需求使用一致的狀態語言；登入後只會看到自己的紀錄。</p></div></section><section className="portalSection"><div className="portalWrap"><LiveRequests/><div className="privacyCallout"><strong>狀態透明，不等於資料公開。</strong><p>私人資料與需求細節仍受使用權限保護。</p></div></div></section></main>}
