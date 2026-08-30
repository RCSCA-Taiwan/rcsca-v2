'use client';
import {useState} from 'react';
import LanguageSwitcher from '../LanguageSwitcher';
const data=[
 {name:'室內設計',count:3,region:'台北 2 · 新北 1',names:['A Space','B Design','C Studio'],state:'active'},
 {name:'餐飲',count:8,region:'台北 4 · 新北 3 · 桃園 1',names:['Kitchen 1%','Table Partner','Good Meal'],state:'active'},
 {name:'法律',count:1,region:'台北 1',names:['Legal Partner'],state:'scarce'},
 {name:'旅宿',count:4,region:'台北 1 · 台中 1 · 南投 1 · 高雄 1',names:['Stay Partner','Hotel One'],state:'active'},
 {name:'交通運輸',count:0,region:'目前無節點',names:[],state:'empty'},
 {name:'寵物服務',count:0,region:'目前無節點',names:[],state:'empty'},
 {name:'醫療照護',count:1,region:'新北 1',names:['Care Partner'],state:'scarce'},
 {name:'教育',count:2,region:'台北 1 · 桃園 1',names:['Learn One','Tutor Partner'],state:'active'}
];
export default function Network(){const [sel,setSel]=useState(0);const d=data[sel];return <main className="networkPage">
<header className="nav"><div className="navInner"><a className="brandLockup" href="/"><span className="brandStack"><span className="brandRcsca">RCSCA</span><small>Cycle of Goodness</small></span><span className="brandCross">×</span><span className="oneMark"><b>1</b><i>%</i></span></a><nav><a href="/my-1percent">MY 1%</a><a href="/1percent-partner">1% PARTNER</a><a href="/care-actions">公益行動</a><a className="navActive" href="/1percent-network">1% NETWORK</a><a href="/cycle-of-goodness">CYCLE OF GOODNESS</a><LanguageSwitcher/></nav></div></header>
<section className="networkHero"><div className="portalWrap"><div className="eyebrow">1% NETWORK · SHARED PROFESSIONAL NETWORK</div><h1>每一種專業，<br/>都可能成為某個人的 1%。</h1><p>這不是會員名錄，也不是商會席位。它讓已經連上的專業被看見，也讓尚缺的一塊保持可見。</p></div></section>
<section className="networkMapSection"><div className="portalWrap networkWorkbench"><div className="networkMap"><div className="netCenter"><b>1</b><i>%</i><small>NETWORK</small></div>{data.map((x,i)=><button key={x.name} onClick={()=>setSel(i)} className={`industryNode node-${i+1} ${x.state} ${sel===i?'selected':''}`}><b>{x.name}</b><span>{x.count?`${x.count} PARTNERS`:'等待第一個 1%'}</span></button>)}<svg className="netLines" viewBox="0 0 800 650" preserveAspectRatio="none"><g>{[[400,325,170,95],[400,325,395,55],[400,325,650,120],[400,325,700,330],[400,325,625,545],[400,325,390,590],[400,325,125,520],[400,325,90,290]].map((l,i)=><line key={i} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]}/>)}</g></svg></div><aside className="networkDetail"><small>{d.state==='empty'?'OPEN NODE':d.state==='scarce'?'SCARCE NODE':'CONNECTED NODE'}</small><h2>{d.name}</h2><strong>{d.count} 家企業／店家</strong><p>{d.region}</p>{d.names.length?<div className="partnerNames">{d.names.map(n=><span key={n}>{n}</span>)}</div>:<div className="emptyInvite"><b>成為這個產業的第一個 1%。</b><p>沒有獨家名額，也不販售席位；你的專業只是把這塊 Network 補起來。</p></div>}<button>查看此產業 →</button></aside></div></section>
<section className="portalSection"><div className="portalWrap"><div className="sectionHead"><div><div className="eyebrow">PUBLIC × MEMBER</div><h2>公開看網絡；深入連結要有權限。</h2></div><p>Visitor 可以看產業與公開企業；共享夥伴可以留下自己的專業；RCSCA MEMBER 才能使用生活找人與工作／人才深層媒合。</p></div><div className="portalGrid three"><article><small>VISITOR</small><h3>看見網絡</h3><p>查看產業、數量、公開企業與缺口。</p></article><article><small>SHARING PARTNER</small><h3>留下專業</h3><p>建立自己的專業節點與可公開資訊。</p></article><article><small>RCSCA MEMBER</small><h3>進入深層連結</h3><p>生活找人、工作、人才與雙方同意後的聯絡交換。</p></article></div></div></section>
</main>}
