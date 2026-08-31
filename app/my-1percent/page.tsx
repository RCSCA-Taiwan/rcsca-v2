'use client';
import SiteHeader from '../SiteHeader';
import { useMemo, useState } from 'react';

const OneMark=({className=''})=><span className={`oneMark ${className}`}><b>1</b><i>%</i></span>;

type Role='visitor'|'partner'|'member';
const roleCopy={
 visitor:{label:'一般參觀者',en:'一般參觀者',desc:'先看懂整個 Cycle，不必先成為會員。當你想留下自己的參與紀錄，再建立 MY 1%。'},
 partner:{label:'共享夥伴',en:'共享夥伴',desc:'已建立 MY 1%，可以留下共享足跡、累積 經驗值／共享等級、加入小隊與使用一般共享功能。'},
 member:{label:'RCSCA MEMBER',en:'MEMBER',desc:'正式會員解鎖更深的共享網絡。一般會員與永久會員在前台不形成階級差異。'}
};

const levels=[
 {lv:'Lv.1',name:'共享起點',tone:'ivory',desc:'完成註冊，留下第一個 1%。'},
 {lv:'Lv.2',name:'共享同行者',tone:'mist',desc:'開始累積真實參與與共享足跡。'},
 {lv:'Lv.3',name:'共享推動者',tone:'champagne',desc:'持續參與，也開始連結他人與資源。'},
 {lv:'Lv.4',name:'共享連結者',tone:'bronze',desc:'參與不只發生在自己，也能讓不同 1% 找到彼此。'},
 {lv:'Lv.5',name:'共享守護者',tone:'blackgold',desc:'以長期、穩定與多元的真實足跡進入最高階段。'}
];

export default function MyOnePercent(){
 const [role,setRole]=useState<Role>('partner');
 const active=roleCopy[role];
 const currentLevel=role==='visitor'?0:role==='partner'?4:4;
 const xp=role==='visitor'?0:1420;
 const next=1800;
 const progress=useMemo(()=>Math.min(100,Math.round(xp/next*100)),[xp]);
 return <main className="myPage">
  <SiteHeader/>

  <section className="myHero"><div className="myHeroInner"><div className="myIntro"><div className="eyebrow">MY 1% · 我的共享</div><h1>我的 <OneMark/>， 從這裡開始被看見。</h1><p>MY 1% 不是會員資料頁，而是你在 Cycle of Goodness 裡的位置：你走過什麼、連上什麼、下一步還可以往哪裡走。</p><div className="roleSwitch" aria-label="身份預覽">{(['visitor','partner','member'] as Role[]).map(r=><button key={r} className={role===r?'active':''} onClick={()=>setRole(r)}><small>{roleCopy[r].en}</small><b>{roleCopy[r].label}</b></button>)}</div></div>
   <div className={`digitalIdentityCard tier-${currentLevel||1}`}><div className="cardShine"></div><div className="cardTop"><span>RCSCA · MY 1%</span><OneMark/></div><div className="cardRole"><small>{active.en}</small><strong>{active.label}</strong></div>{role==='visitor'?<div className="visitorCardText">尚未建立 MY 1% <span>註冊後，這張卡才開始留下你的共享足跡。</span></div>:<><div className="cardName">王○○</div><div className="cardMeta">Lv.4 共享連結者 · 暖陽小隊</div><div className="cardMeta">同行第 2,846 天</div><div className="cardQr" aria-label="QR placeholder"><i></i><i></i><i></i><i></i></div></>}<div className="cardFooter">卡片材質隨參與階段進化；身份權限與 Level 分開計算。</div></div>
  </div></section>

  <section className="identitySection"><div className="myWrap"><div className="sectionHead"><div><div className="eyebrow">身份 × 使用權限</div><h2>先知道「我是誰」，再知道「我能做什麼」。</h2></div><p>共享等級代表參與歷程；正式會籍代表正式會籍；使用權限代表可使用功能。三者不互相取代。</p></div>
   <div className="identityRail">{(['visitor','partner','member'] as Role[]).map((r,i)=><article key={r} className={role===r?'active':''} onClick={()=>setRole(r)}><span className="identityIndex">0{i+1}</span><small>{roleCopy[r].en}</small><h3>{roleCopy[r].label}</h3><p>{roleCopy[r].desc}</p><div className="identityArrow">{i<2?'→':'✓'}</div></article>)}</div>
   <div className="permissionMatrix"><div className="pmHead"><span>功能</span><b>一般參觀者</b><b>共享夥伴</b><b>RCSCA MEMBER</b></div>{[
    ['瀏覽公開內容','✓','✓','✓'],['建立 MY 1%','—','✓','✓'],['共享足跡／經驗值／共享等級','—','✓','✓'],['數位共享卡','—','✓','✓'],['加入共享小隊','—','✓','✓'],['1% 共享所／一般禮遇','—','✓','✓'],['1% NETWORK 公開資訊','✓','✓','✓'],['生活人力資源網','—','—','✓'],['工作／人才深層媒合','—','—','✓'],['正式會員 1% 專屬','—','—','✓']
   ].map((row,i)=><div className="pmRow" key={i}><span>{row[0]}</span><b>{row[1]}</b><b>{row[2]}</b><b>{row[3]}</b></div>)}</div>
  </div></section>

  <section className="journeySection"><div className="myWrap"><div className="sectionHead"><div><div className="eyebrow">共享等級旅程</div><h2>我現在在哪裡，下一步會開啟什麼。</h2></div><p>不以認購金額決定共享等級。等級來自真實參與、持續性、連結與必要成就條件。</p></div>
   <div className="journeyStatus"><div><small>目前階段</small><strong>{role==='visitor'?'尚未開始':'Lv.4 · 共享連結者'}</strong></div><div><small>終身 XP</small><strong>{xp.toLocaleString()} XP</strong></div><div><small>下一階段</small><strong>{role==='visitor'?'建立 MY 1%':'Lv.5 · 共享守護者'}</strong></div></div>
   <div className="xpBar"><i style={{width:`${progress}%`}}></i></div><div className="levelTrack">{levels.map((l,i)=><article className={`${l.tone} ${currentLevel===i+1?'current':''}`} key={l.lv}><span>{l.lv}</span><h3>{l.name}</h3><p>{l.desc}</p>{currentLevel===i+1&&<b>目前位置</b>}</article>)}</div>
   <div className="unlockStrip"><div><small>下一階段可能解鎖</small><strong>1% 專屬 · 進階卡面 · 特殊共享徽章</strong></div><span>🔒</span></div>
  </div></section>

  <section className="dashboardSection"><div className="myWrap"><div className="sectionHead"><div><div className="eyebrow">我的共享足跡</div><h2>不是看我付出多少，而是看我走過什麼。</h2></div><p>共享點可以使用；XP 記錄終身共享經驗；共享足跡保留每一次真實參與的來源。</p></div>
   <div className="metricGrid"><div><strong>{role==='visitor'?'—':'1,280'}</strong><span>共享點</span></div><div><strong>{role==='visitor'?'—':'32'}</strong><span>共享足跡</span></div><div><strong>{role==='visitor'?'—':'6'}</strong><span>成功連結</span></div><div><strong>{role==='visitor'?'—':'8'}</strong><span>已解鎖徽章</span></div></div>
   <div className="dashGrid"><article className="dashCard"><small>今天</small><h3>今天的 1%</h3><div className="taskRow"><span>每日簽到</span><b>+1</b></div><div className="taskRow"><span>看看今天共享網絡缺哪一塊</span><b>+1</b></div><div className="taskRow"><span>分享一個有幫助的內容</span><b>+2</b></div></article>
    <article className="dashCard"><small>共享小隊</small><h3>暖陽小隊</h3><p>32 位成員 · 本月共同完成 86 次共享</p><div className="teamBar"><i></i></div><span className="micro">再完成 3 次真實公益行動，解鎖下一個團隊里程碑。</span><a className="dashLink" href="/team">查看我的小隊 →</a></article>
    <article className="dashCard"><small>隱藏解鎖</small><h3>一個 1% 尚未解鎖</h3><p>它可能跟同行年資、真實公益足跡、連結或其他秘密成就有關。</p><a className="dashLink" href="/share-market">進入 1% 共享所 →</a></article>
   </div>
  </div></section>

  <section className="memberLayer"><div className="myWrap"><div className="memberLayerHead"><div><div className="eyebrow">RCSCA 正式會員 · 深層共享</div><h2>不是更高等級，而是多一層共享網絡。</h2><p>一般會員與永久會員前台都只顯示 RCSCA MEMBER；相同行為維持相同 XP，不用會費買等級。</p></div><div className="memberSeal">RCSCA <b>MEMBER</b></div></div>
   <div className="memberFeatureGrid"><article><span>01</span><h3>生活人力資源網</h3><p>找水電、保險、法律、設計、服務與可信任的專業連結。</p></article><article><span>02</span><h3>工作 × 人才</h3><p>會員找工作、企業找人才；不公開會員名單，雙方同意後才交換聯絡方式。</p></article><article><span>03</span><h3>MEMBER 1%</h3><p>會員限定任務、活動、部分企業專屬共享與會員成就。</p></article></div>
   <div className="memberDoor"><div><small>一般參觀者／共享夥伴也看得到這扇門</small><strong>先理解價值，再決定是否正式成為 RCSCA 正式會員。</strong></div><a href="/member-network">預覽會員專屬 →</a></div>
  </div></section>

  <section className="myStartCta"><div className="myWrap"><div><div className="eyebrow">第一次來到 MY 1%</div><h2>還不知道自己的 1% 是什麼，也可以先開始。</h2><p>不用先承諾捐款或服務時數。先留下你可能願意分享的方式，之後再由真實參與慢慢形成足跡。</p></div><a href="/my-1percent/start">建立我的 MY 1% →</a></div></section>

  <section className="myClosing"><div><div className="eyebrow">MY 1%</div><h2>每個人的 1%，都不一樣。</h2><p>但當它被留下、被連結、再走進下一段關係，它就不再只屬於一個人。</p></div><a href="/">回到 RCSCA 首頁</a></section>
 </main>
}
