'use client';
import {useEffect,useState} from 'react';
const slides=[
 {tag:'最新活動',title:'協會活動與最新公告',body:'掌握近期公益活動、報名及參與資訊。',href:'/care-actions',cta:'查看活動'},
 {tag:'共享團購',title:'最新團購與服務方案',body:'探索經協會審核的企業商品及服務型共享團購。',href:'/group-buy',cta:'查看共享團購'},
 {tag:'共享愛心公池',title:'共享資源持續累積',body:'查看公池最新共享資訊及公開成果；實際數據以公池頁面為準。',href:'/love-pool',cta:'查看公池'}
];
export default function HomeSpotlight(){
 const [active,setActive]=useState(0),[paused,setPaused]=useState(false);
 useEffect(()=>{if(paused)return;const id=window.setInterval(()=>setActive(i=>(i+1)%slides.length),6500);return()=>window.clearInterval(id)},[paused]);
 const slide=slides[active];
 return <section className="homeSpotlight" aria-label="RCSCA 共享焦點" onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} onFocus={()=>setPaused(true)} onBlur={()=>setPaused(false)}>
 <div className="homeSpotlightInner"><div className="homeSpotlightHeading"><div><div className="eyebrow">RCSCA · 共享焦點</div><h2>正在發生的共享</h2></div><p>活動・團購・愛心公池</p></div>
 <div className="homeSpotlightPanel"><div className="homeSpotlightVisual" aria-hidden="true"><span className="homeSpotlightMark">RCSCA <b>× 1%</b></span><span className="homeSpotlightNumber">0{active+1}</span></div><div className="homeSpotlightCopy" aria-live="polite"><span className="homeSpotlightTag">{slide.tag}</span><h3>{slide.title}</h3><p>{slide.body}</p><a href={slide.href}>{slide.cta} →</a></div></div>
 <div className="homeSpotlightControls"><button type="button" aria-label="上一則" onClick={()=>setActive(i=>(i+slides.length-1)%slides.length)}>‹</button><div className="homeSpotlightDots" aria-label="選擇輪播內容">{slides.map((s,i)=><button key={s.tag} type="button" aria-label={'顯示'+s.tag} aria-current={i===active?'true':undefined} className={i===active?'isActive':''} onClick={()=>setActive(i)}/>)}</div><button type="button" aria-label="下一則" onClick={()=>setActive(i=>(i+1)%slides.length)}>›</button></div>
 </div></section>
}