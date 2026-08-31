import SiteHeader from '../../SiteHeader';
import LiveAdminQueue from './LiveAdminQueue';
export default function AdminQueue(){return <main className="adminPage"><SiteHeader/><section className="flowHero"><div className="portalWrap"><div className="eyebrow">後台工作佇列</div><h1>所有待辦，集中在同一個地方。</h1><p>公益核實、企業共享、1% Network 與限制個案依權限分流；前台保持簡單，後台則保留完整狀態與處理軌跡。</p></div></section><section className="portalSection"><div className="portalWrap"><LiveAdminQueue/></div></section><p><a href="/admin/outcomes">前往成果整理工作區 →</a></p></main>}
