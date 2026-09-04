import SiteHeader from '../../SiteHeader';
import LiveChangeRequests from './LiveChangeRequests';
export default function Page(){return <main className="adminPage"><SiteHeader/><section className="adminHero"><div className="portalWrap"><div className="eyebrow">RCSCA 後台 · 公開資料維護</div><h1>核准公開後的修改與下架，也必須留下審核紀錄。</h1><p>企業共享與 1% Network 節點不允許擁有者直接覆寫已核准公開內容；所有變更先形成申請，再由管理端核准。</p></div></section><section className="portalSection"><div className="portalWrap"><LiveChangeRequests/></div></section></main>}
