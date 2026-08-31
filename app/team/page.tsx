'use client';
import SiteHeader from '../SiteHeader';
import {useState} from 'react';
const members=['王○○','林○○','陳○○','張○○','李○○','周○○'];
export default function Team(){const [copied,setCopied]=useState(false);return <main className="teamPage"><SiteHeader/>
<section className="teamHero"><div className="portalWrap"><div><div className="eyebrow">共享小隊</div><h1>人介紹人進來，也可以一起留下團隊的共享足跡。</h1><p>小隊是凝聚與來源辨識，不是上下線制度。沒有抽成、沒有拉人利益，個人等級仍由自己的真實參與決定。</p></div><div className="teamBadge"><small>暖陽小隊</small><strong>TEAM Lv.4</strong><span>32 位成員 · 本月 86 次共享</span></div></div></section>
<section className="portalSection"><div className="portalWrap"><div className="teamSummary"><div><small>本月共同參與</small><strong>86</strong></div><div><small>成功連結</small><strong>18</strong></div><div><small>公益行動</small><strong>21</strong></div><div><small>知識分享</small><strong>47</strong></div></div><div className="sectionHead"><div><div className="eyebrow">團隊里程碑</div><h2>團隊榮譽來自一起完成的事，不來自誰花得比較多。</h2></div><p>再完成 3 次真實公益行動，即可解鎖下一個團隊里程碑。</p></div><div className="teamProgress"><i></i></div>
<div className="teamColumns"><article><small>介紹來源</small><h3>註冊時保留最初介紹人</h3><p>日後換小隊不會覆蓋最初介紹來源，方便協會知道人際脈絡與活動來源。</p><button onClick={()=>{navigator.clipboard?.writeText('https://rcsca.example/join?team=warm');setCopied(true)}}>{copied?'邀請連結已複製':'複製小隊邀請連結'}</button></article><article><small>近期成員</small><h3>最近加入</h3><div className="memberChips">{members.map(m=><span key={m}>{m}</span>)}</div><p className="micro">只顯示可公開暱稱；私人聯絡方式不因加入小隊而公開。</p></article></div></div></section>
</main>}
