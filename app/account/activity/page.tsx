import SiteHeader from '../../SiteHeader';
import LiveActivity from './LiveActivity';
export default function Activity(){return <main><SiteHeader/><section className="accountHero"><div className="portalWrap"><div className="eyebrow">我的共享紀錄</div><h1>每一次真實參與，都留下可回看的足跡。</h1><p>這裡只顯示登入者自己的已核實紀錄；金額不是共享等級的判斷依據。</p></div></section><section className="portalSection"><div className="portalWrap"><LiveActivity/></div></section></main>}
