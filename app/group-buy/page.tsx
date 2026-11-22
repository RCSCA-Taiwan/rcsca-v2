'use client';
import SiteHeader from '../SiteHeader';
import {useEffect,useState} from 'react';
import {getSupabaseBrowserClient} from '../../lib/supabase-browser';
type Offer={id:string;title:string;description:string|null;unit_price:number;planned_quantity:number;committed_gift_quantity:number;delivered_gift_quantity:number;sold_quantity:number;gift_reference_price:number;offering_type:string;service_area:string|null;service_validity:string|null;booking_terms:string|null;starts_at:string|null;ends_at:string|null};
export default function GroupBuyPage(){
 const [offers,setOffers]=useState<Offer[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(false);
 const [member,setMember]=useState(false),[signed,setSigned]=useState(false);
 useEffect(()=>{let live=true;(async()=>{try{const s=getSupabaseBrowserClient() as any;const [r,auth]=await Promise.all([s.from('group_buy_offers').select('id,title,description,unit_price,planned_quantity,committed_gift_quantity,delivered_gift_quantity,sold_quantity,gift_reference_price,offering_type,service_area,service_validity,booking_terms,starts_at,ends_at').eq('status','open').order('created_at',{ascending:false}),s.auth.getSession()]);if(r.error)throw r.error;if(!live)return;setOffers((r.data||[]) as Offer[]);const user=auth.data.session?.user;if(user){setSigned(true);const m=await s.from('memberships').select('status').eq('user_id',user.id).maybeSingle();if(live)setMember(!m.error&&m.data?.status==='active');}}catch{if(live)setError(true)}finally{if(live)setLoading(false)}})();return()=>{live=false}},[]);
 return <main className="institutionPage" lang="zh-Hant"><SiteHeader/><section className="portalSection"><div className="portalWrap legalCopy">
 <p className="eyebrow">RCSCA × 1%｜企業共享</p><h1>共享團購</h1><p>每一件經協會審核的共享團購商品，都必須由合作企業承諾無償提供一定數量的共享商品，供會員積分兌換、好禮分享或指定公益用途。</p>
 <div style={{border:'1px solid #c4cec8',borderRadius:16,padding:20,margin:'24px 0'}}>
 <h2 style={{marginTop:0}}>會員專屬團購</h2><p>{member?'已確認有效 RCSCA 會員資格。團購登記功能待交易流程驗收後開放。':signed?'您已登入；只有有效正式會員可以參與團購。':'您可瀏覽公開團購資訊，登入並取得有效正式會員資格後才能參與。'}</p>
 <a className="textRoute" href="/account/identity">查看會員資格 →</a>
 </div>
 <h2>目前團購商品與服務</h2>
 {loading?<p>正在讀取商品…</p>:error?<p role="alert">商品資料讀取失敗，請稍後重試。</p>:offers.length===0?<p>目前尚無正式開團商品。企業商品與共享承諾須經協會核實後才會在此顯示。</p>:<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:16}}>{offers.map(o=><article key={o.id} style={{border:'1px solid #d6ded9',borderRadius:16,padding:20}}><h3>{o.title}</h3><p>{o.offering_type==='service'?'服務型團購':o.offering_type==='mixed'?'商品＋服務':'實體商品'}</p>{o.service_area&&<p>服務地區：{o.service_area}</p>}{o.service_validity&&<p>服務使用期限：{o.service_validity}</p>}{o.booking_terms&&<p>預約及改期：{o.booking_terms}</p>}<p>{o.description}</p><p><strong>團購價 NT$ {Number(o.unit_price).toLocaleString('zh-TW')}</strong></p><p>企業共享承諾：{o.committed_gift_quantity} {o.offering_type==='service'?'份服務':'件'}</p><p>已核實共享：{o.delivered_gift_quantity} {o.offering_type==='service'?'份服務':'件'}</p><p>{o.ends_at?'截止日期：'+new Date(o.ends_at).toLocaleDateString('zh-TW'):'活動期間依公告'}</p><button disabled style={{opacity:.6,padding:'10px 16px'}}>團購登記（尚未開放）</button></article>)}</div>}
 <h2>企業共享承諾如何計算？</h2><p>暫以團購商品價值的 1% 作為最低共享價值基準，先承諾並交付最低數量，結團後再依實際成交數量結算差額。高單價商品的等值替代須經協會審核。</p>
 <h2>企業上架流程</h2><ol><li>企業提供商品資訊、價格、預計數量及共享商品承諾。</li><li>協會審核商品與共享價值，確認應提供的最低件數。</li><li>企業交付共享商品並完成協會核實後，才開放正式團購。</li><li>團購結束後依實際成交數量結算共享承諾。</li><li>共享商品由協會分配至積分兌換、好禮分享或公益用途。</li></ol>
 <p>此頁已連接正式商品資料表；付款、下單、企業交付審核及自動結算仍在建置中，尚未對外開放。</p>
 <p><a className="textRoute" href="/share-market">前往積分兌換 →</a></p>
 <p><a className="textRoute" href="/love-pool">了解共享愛心公池 →</a></p>
 </div></section></main>
}