import SiteHeader from '../../SiteHeader';
import LiveMatches from './LiveMatches';

export default function Matches(){return <main className="matchesPage"><SiteHeader/>
<section className="networkHero"><div className="portalWrap"><div className="eyebrow">1% Network · 我的媒合</div><h1>知道現在連到哪裡，也知道還缺哪一步。</h1><p>1% Network 不直接公開私人聯絡方式。先以需求摘要互相看見，雙方願意後才進下一步。</p></div></section>
<section className="portalSection"><div className="portalWrap"><LiveMatches/><div className="privacyCallout"><strong>媒合不是公開名冊。</strong><p>會員或企業可以提出「我需要什麼／我能提供什麼」，RCSCA 負責讓適合的節點互相看見；私人電話、Email 與個案資料不直接公開。</p></div></div></section>
</main>}
