'use client';
import SiteHeader from '../SiteHeader';
import {useMemo,useState} from 'react';

type Category='all'|'daily'|'selected'|'rare'|'secret';
const rewards=[
 {id:1,cat:'daily',label:'日常共享',title:'合作咖啡｜飲品一杯',points:250,stock:34,total:60,note:'每人本月限一次。'},
 {id:2,cat:'selected',label:'精選共享',title:'親子餐廳｜雙人餐點禮遇',points:520,stock:12,total:20,note:'由 1% 企業夥伴提供的限量共享。'},
 {id:3,cat:'rare',label:'稀有共享',title:'旅宿夥伴｜平日住宿一晚',points:980,stock:3,total:6,note:'需完成至少 12 筆真實共享足跡。'},
 {id:4,cat:'secret',label:'1% 專屬',title:'尚未揭曉的 1%',points:0,stock:0,total:0,note:'解鎖條件可能與同行年資、連結或特殊成就有關。'}
] as const;
export default function ShareMarket(){
 const [cat,setCat]=useState<Category>('all');
 const [selected,setSelected]=useState<number|null>(null);
 const list=useMemo(()=>rewards.filter(r=>cat==='all'||r.cat===cat),[cat]);
 const item=rewards.find(r=>r.id===selected);
 return <main className="marketPage"><SiteHeader/>
  <section className="marketHero"><div className="portalWrap"><div><div className="eyebrow">1% 共享所</div><h1>有人記得你的參與，也有人願意把自己的 1% 分享回來。</h1><p>這裡不是商城。共享點用來兌換企業與夥伴自願提供的產品或服務；公益指定資源不會被轉成會員獎品。</p></div><div className="marketWallet"><small>目前共享點</small><strong>1,280</strong><span>終身共享經驗 1,420 XP · Lv.4 共享連結者</span></div></div></section>
  <section className="portalSection"><div className="portalWrap"><div className="marketRules"><span>共享點可以使用</span><span>XP 不因兌換扣除</span><span>同活動不重複計點</span><span>金額不決定等級</span></div><div className="marketTabs">{[['all','全部'],['daily','日常共享'],['selected','精選共享'],['rare','稀有共享'],['secret','1% 專屬']].map(x=><button key={x[0]} className={cat===x[0]?'active':''} onClick={()=>setCat(x[0] as Category)}>{x[1]}</button>)}</div>
   <div className="marketGrid">{list.map(r=><article key={r.id} className={`rewardCard ${r.cat==='secret'?'secret':''}`}><small>{r.label}</small><h3>{r.title}</h3><p>{r.note}</p>{r.cat!=='secret'?<><div className="rewardMeta"><b>{r.points} 共享點</b><span>剩餘 {r.stock} / {r.total}</span></div><button onClick={()=>setSelected(r.id)}>查看兌換 →</button></>:<div className="lockedReward">🔒 尚未解鎖</div>}</article>)}</div>
  </div></section>
  <section className="portalSection softPortal"><div className="portalWrap"><div className="sectionHead"><div><div className="eyebrow">共享來源</div><h2>企業提供公益資源，和提供共享者回饋，是兩件不同的事。</h2></div><p>所有項目都先確認用途：公益需求進 CARE；會員禮遇另列；企業自願提供給持續參與者的內容才進共享所。</p></div></div></section>
  {item&&<div className="marketModal" onClick={()=>setSelected(null)}><div onClick={e=>e.stopPropagation()}><button className="modalClose" onClick={()=>setSelected(null)}>×</button><small>{item.label}</small><h2>{item.title}</h2><p>{item.note}</p><div className="modalCost"><strong>{item.points}</strong><span>共享點</span></div><button className="modalPrimary">保留兌換資格</button><p className="micro">正式版會產生限時核銷碼；目前為流程原型。</p></div></div>}
 </main>
}
