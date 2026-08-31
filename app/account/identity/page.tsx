'use client';
import SiteHeader from '../../SiteHeader';
import Link from 'next/link';
import {useState} from 'react';

const roles=[
 {key:'visitor',name:'一般參觀者',note:'尚未建立共享身份',level:'沒有共享等級',items:['瀏覽公開內容','查看公益行動','查看公開 1% Network','了解善循環'],locked:['共享足跡','小隊','共享點與等級','正式會員深層網絡']},
 {key:'partner',name:'共享夥伴',note:'已建立 MY 1%',level:'開始累積共享等級',items:['MY 1%','共享足跡','共享點與等級','數位共享卡','小隊','部分 1% 解鎖'],locked:['正式會員深層網絡','會員限定工作與人才','會員限定專業媒合']},
 {key:'member',name:'RCSCA MEMBER',note:'協會正式會員',level:'等級仍依參與，不依會費',items:['共享夥伴全部功能','生活找人','工作與人才','會員限定任務與共享','會員專屬媒合'],locked:[]}
];

export default function Identity(){
 const [role,setRole]=useState('partner');
 const current=roles.find(r=>r.key===role)!;
 return <main className="identityPage"><SiteHeader/>
  <section className="flowHero"><div className="portalWrap"><div className="eyebrow">身份與使用權限</div><h1>先看懂「我是誰」，再決定我能進到哪裡。</h1><p>共享等級、協會會籍與使用權限是三件不同的事。等級代表參與歷程；會籍代表協會正式身份；權限則決定哪些深層功能可以使用。</p></div></section>
  <section className="portalSection"><div className="portalWrap">
   <div className="identityRail">{roles.map(r=><button key={r.key} className={role===r.key?'active':''} onClick={()=>setRole(r.key)}><small>{r.note}</small><b>{r.name}</b><span>{r.level}</span></button>)}</div>
   <div className="identityDetail"><div><div className="eyebrow">目前檢視</div><h2>{current.name}</h2><p>{current.note}。{current.level}。</p></div><div className="identityLists"><section><h3>可以使用</h3>{current.items.map(i=><span key={i}>✓ {i}</span>)}</section><section><h3>尚未開啟</h3>{current.locked.length?current.locked.map(i=><span key={i}>— {i}</span>):<span>目前沒有額外鎖定項目</span>}</section></div></div>
   <div className="permissionMatrix"><div className="pmHead"><span>功能</span><span>一般參觀者</span><span>共享夥伴</span><span>RCSCA MEMBER</span></div>{[
    ['公開公益行動','✓','✓','✓'],['MY 1%','—','✓','✓'],['共享等級／共享點','—','✓','✓'],['數位共享卡','—','✓','✓'],['小隊','—','✓','✓'],['1% 共享所','瀏覽','✓','✓'],['生活找人','—','—','✓'],['工作與人才','公開職缺','部分','✓'],['會員深層專業媒合','—','—','✓']
   ].map(r=><div className="pmRow" key={r[0]}>{r.map((c,i)=><span key={i}>{c}</span>)}</div>)}</div>
   <div className="identityFooter"><p><b>一般會員與永久會員：</b>前台都顯示 RCSCA MEMBER，不形成高低階級。共享等級也不因會費高低而不同。</p><Link className="primaryFlow" href="/my-1percent">回到 MY 1%</Link></div>
  </div></section>
 </main>
}
