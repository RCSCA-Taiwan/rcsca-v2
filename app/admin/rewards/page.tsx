import AdminPageIntro from '../AdminPageIntro';import SiteHeader from '../../SiteHeader';
import LiveAdminRewards from './LiveAdminRewards';
import LiveRewardCatalog from './LiveRewardCatalog';
export default function AdminRewards(){return <main className="adminPage"><SiteHeader/><section className="flowHero"><div className="portalWrap"><div className="eyebrow">共享所 · 核銷</div><h1>核准、扣點、庫存與兌換碼在同一條受控流程完成。</h1><p>XP 不因兌換扣除；公益指定資源也不會進入這個流程。</p></div></section><section className="portalSection"><div className="portalWrap"><LiveRewardCatalog/><LiveAdminRewards/></div></section></main>}
