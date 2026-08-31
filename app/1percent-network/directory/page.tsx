import SiteHeader from '../../SiteHeader';
import { publicSelect } from '../../../lib/supabase-public';

type Enterprise = {id:string;display_name:string|null;legal_name:string;industry:string|null;region:string|null;public_description:string|null};
type Share = {enterprise_id:string;share_type:string;title:string;description:string|null};

export const dynamic = 'force-dynamic';

export default async function Directory(){
 const enterprises=await publicSelect<Enterprise>('enterprises','select=id,display_name,legal_name,industry,region,public_description&status=eq.approved&order=display_name.asc');
 const shares=await publicSelect<Share>('enterprise_shares','select=enterprise_id,share_type,title,description&status=eq.approved&public_result=eq.true');
 return <main className="networkPage"><SiteHeader/>
 <section className="networkHero"><div className="portalWrap"><div className="eyebrow">1% NETWORK · 公開夥伴</div><h1>看見已經連上的專業與資源。</h1><p>這裡只顯示企業同意公開的資料；私人聯絡方式與會員資料不會公開。</p></div></section>
 <section className="portalSection"><div className="portalWrap"><div className="sectionHead"><div><div className="eyebrow">STAGING LIVE DATA</div><h2>目前公開夥伴</h2></div><p>{enterprises.length} 個公開節點 · 資料由 RCSCA V2 Staging 即時讀取</p></div>
 <div className="portalGrid three">{enterprises.length?enterprises.map(e=>{const es=shares.filter(s=>s.enterprise_id===e.id);return <article key={e.id}><small>{e.industry||'其他'} · {e.region||'未設定'}</small><h3>{e.display_name||e.legal_name}</h3><p>{e.public_description||'尚未提供公開說明'}</p>{es.map(s=><div key={s.title} className="networkOffers"><small>正在分享的 1%</small><b>{s.title}</b></div>)}</article>}):<article><small>目前沒有公開資料</small><h3>等待第一個 1%</h3><p>Staging 連線正常時，核准且公開的企業會出現在這裡。</p></article>}</div></div></section>
 </main>;
}
