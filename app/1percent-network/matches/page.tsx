'use client';
import SiteHeader from '../../SiteHeader';
import {useState} from 'react';

const initial=[
 {type:'我在尋找',title:'新北｜活動場地與交通協力',status:'等待回應',who:'3 個可能節點',privacy:'尚未交換聯絡方式'},
 {type:'我能提供',title:'室內設計｜公益空間初步諮詢',status:'已有需求',who:'RCSCA 已媒合 1 件',privacy:'等待雙方同意'},
 {type:'工作機會',title:'行政兼職｜友善二度就業',status:'媒合中',who:'2 位有興趣',privacy:'聯絡資料仍受保護'}
];
export default function Matches(){const [tab,setTab]=useState('全部');const rows=tab==='全部'?initial:initial.filter(x=>x.type===tab);return <main className="matchesPage"><SiteHeader/>
<section className="networkHero"><div className="portalWrap"><div className="eyebrow">1% Network · 我的媒合</div><h1>知道現在連到哪裡，也知道還缺哪一步。</h1><p>1% Network 不直接公開私人聯絡方式。先以需求摘要互相看見，雙方願意後才進下一步。</p></div></section>
<section className="portalSection"><div className="portalWrap"><div className="matchTabs">{['全部','我在尋找','我能提供','工作機會'].map(t=><button key={t} className={tab===t?'active':''} onClick={()=>setTab(t)}>{t}</button>)}</div><div className="matchList">{rows.map(x=><article key={x.title}><div><small>{x.type}</small><h3>{x.title}</h3><p>{x.who} · {x.privacy}</p></div><span>{x.status}</span></article>)}</div><div className="privacyCallout"><strong>媒合不是公開名冊。</strong><p>會員或企業可以提出「我需要什麼／我能提供什麼」，RCSCA 負責讓適合的節點互相看見；私人電話、Email 與個案資料不直接公開。</p></div></div></section>
</main>}
