'use client';
import {useState} from 'react';
import LanguageSwitcher from '../LanguageSwitcher';
const OneMark=()=> <span className="oneMark"><b>1</b><i>%</i></span>;
const stages=[
 ['01','1% Partner','完成企業身份與第一筆真實共享紀錄'],
 ['02','Active Partner','持續參與，不只一次性合作'],
 ['03','Connecting Partner','開始提供工作、專業、服務或 Connection'],
 ['04','Impact Partner','共享跨越 CARE × CONNECT，形成可追蹤影響'],
 ['05','Cycle Partner','長期穩定參與，並促成新的 1% 回到網絡']
];
export default function Partner(){const [stage,setStage]=useState(2);return <main className="partnerPage">
<header className="nav"><div className="navInner"><a className="brandLockup" href="/"><span className="brandStack"><span className="brandRcsca">RCSCA</span><small>Cycle of Goodness</small></span><span className="brandCross">×</span><OneMark/></a><nav><a href="/my-1percent">MY 1%</a><a className="navActive" href="/1percent-partner">1% PARTNER</a><a href="/care-actions">公益行動</a><a href="/1percent-network">1% NETWORK</a><a href="/cycle-of-goodness">CYCLE OF GOODNESS</a><LanguageSwitcher/></nav></div></header>
<section className="partnerHero"><div className="portalWrap"><div><div className="eyebrow">ENTERPRISE · 1% PARTNER</div><h1>企業不是贊助者，<br/>而是 Cycle 裡的一個節點。</h1><p>資金、產品、服務、專業、場地、工作機會與 Connection，都可能成為企業的 1%。企業身份是 1% PARTNER；企業分享的內容，才叫企業的 1%。</p></div><div className={`enterpriseCard stage-${stage}`}><small>RCSCA · 1% PARTNER</small><strong>ACME COMPANY</strong><span>STAGE {stage} · {stages[stage-1][1]}</span><em>2027 PARTNER</em><OneMark/></div></div></section>
<section className="portalSection"><div className="portalWrap"><div className="sectionHead"><div><div className="eyebrow">PARTNER JOURNEY</div><h2>不是誰贊助最多，而是共享走得多深。</h2></div><p>企業成長階段依持續參與、實際共享、工作機會、專業服務、Connection 與 Impact 綜合形成；不以金額買等級。</p></div><div className="partnerStages">{stages.map((s,i)=><button key={s[0]} className={stage===i+1?'active':''} onClick={()=>setStage(i+1)}><small>{s[0]}</small><b>{s[1]}</b><span>{s[2]}</span></button>)}</div></div></section>
<section className="portalSection darkPortal"><div className="portalWrap"><div className="sectionHead"><div><div className="eyebrow">ENTERPRISE 1%</div><h2>同一個企業，可以分享不同形式的 1%。</h2></div><p>用途先確認，再進入對的位置。公益資源、共享所、會員禮遇彼此分流。</p></div><div className="portalGrid three"><article><small>CARE</small><h3>公益需求</h3><p>物資、服務、場地、員工人力與專業，依真實需求媒合。</p></article><article><small>CONNECT</small><h3>工作 × 人才 × 專業</h3><p>提供職缺、接案、服務、合作與可信任的專業節點。</p></article><article><small>MEMBER</small><h3>1% 禮遇</h3><p>提供具有實質內容的會員禮遇；不等於公益指定資源。</p></article></div></div></section>
<section className="portalSection"><div className="portalWrap"><div className="sectionHead"><div><div className="eyebrow">ANNUAL BADGE</div><h2>年度 1% 標章，記錄的是實際共享。</h2></div><p>標章不是付費取得，也不是 RCSCA 官方推薦或 ESG 認證。每年依已完成的真實共享重新核發。</p></div><div className="badgeDemo"><div><OneMark/><strong>1% PARTNER</strong><span>2027 · RCSCA</span></div><p>掃描標章後，只顯示企業當年度公開共享紀錄與可公開 Impact，不顯示贊助金額與會員個資。</p></div></div></section>
<section className="portalSection softPortal"><div className="portalWrap"><div className="sectionHead"><div><div className="eyebrow">TOOLS</div><h2>企業進來之後，不只看到一張標章。</h2></div></div><div className="portalGrid three"><article><h3>Impact</h3><p>年度共享足跡、參與人次、志工時數、合作紀錄與成果素材。</p></article><article><h3>1% Network</h3><p>查看自己的產業節點、目前夥伴與區域缺口。</p><a href="/1percent-network">進入 Network →</a></article><article><h3>ESG 素材</h3><p>可整理成果資料，但 ESG 是參與後的結果，不是公益合作的交換條件。</p></article></div></div></section>
</main>}
