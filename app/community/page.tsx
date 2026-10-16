import SiteHeader from '../SiteHeader';
import CommunityBoard from './CommunityBoard';
export default function CommunityPage(){return <main className="flowPage" lang="zh-Hant"><SiteHeader/><section className="flowHero"><div className="portalWrap"><div className="eyebrow">共享交流</div><h1>每日分享一點，讓善意繼續。</h1><p>登入後可參與主題討論。每人每天可申請一個主題，審核通過獲得 2 分；首次回覆其他人的每個主題可獲得 1 分，同題不重複給分。</p></div></section><section className="portalSection"><div className="portalWrap"><CommunityBoard/></div></section></main>;}
