import SiteHeader from '../SiteHeader';
import CommunityBoard from './CommunityBoard';
export default function CommunityPage(){return <main className="flowPage" lang="zh-Hant"><SiteHeader/><section className="flowHero"><div className="portalWrap"><div className="eyebrow">共享交流</div><h1>分享參與，交流經驗。</h1><p>登入後可查看經審核的分享，並提出文字與圖片投稿。發文不會自動增加積分或 XP。</p></div></section><section className="portalSection"><div className="portalWrap"><CommunityBoard/></div></section></main>;}
