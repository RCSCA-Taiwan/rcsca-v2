import SiteHeader from '../../SiteHeader';
import LivePersonalDataRequests from './LivePersonalDataRequests';

export default function AdminPersonalDataRequestsPage(){return <main className="adminPage"><SiteHeader/><section className="flowHero"><div className="portalWrap"><div className="eyebrow">個人資料申請</div><h1>審核、處理與真正執行分開。</h1><p>修改、全部重置與刪除申請都保留清楚的狀態與稽核軌跡；高影響操作只有在實際執行成功後才能完成。</p></div></section><section className="portalSection"><div className="portalWrap"><LivePersonalDataRequests/><p><a className="textRoute" href="/admin/queue">← 返回後台工作佇列</a></p></div></section></main>}
