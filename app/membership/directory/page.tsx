import SiteHeader from '../../SiteHeader';
import MembershipDirectory from './MembershipDirectory';
export default function MembershipDirectoryPage(){return <main className="membershipPage"><SiteHeader/><section className="flowHero"><div className="portalWrap"><div className="eyebrow">RCSCA會員S</div><h1>每一份關懷，都有人同行。</h1><p>年度會員名冊列出已由協會確認的會籍、正式入會日期與介紹人。一般與永久為會籍類型，不代表共享等級高低。</p></div></section><section className="portalSection"><div className="portalWrap"><MembershipDirectory/></div></section></main>}
