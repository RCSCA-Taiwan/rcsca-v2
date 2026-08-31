'use client';
import SiteHeader from '../../SiteHeader';
import {useState} from 'react';
const fields=['室內設計','餐飲','法律','旅宿','交通運輸','寵物服務','醫療照護','教育','水電工程','保險','會計','汽車','其他'];
export default function JoinNetwork(){const [sent,setSent]=useState(false);return <main className="flowPage"><SiteHeader/>
<section className="flowHero"><div className="portalWrap"><div className="eyebrow">1% Network · 加入共享專業網絡</div><h1>把你的專業，補進目前還缺的那一塊。</h1><p>沒有獨家席位，也不販售產業名額。加入代表願意在適合的時候，讓自己的專業成為一個可被連結的 1%。</p></div></section>
<section className="portalSection"><div className="portalWrap joinNetworkGrid"><div><small>01 · 選擇專業</small><h2>你的主要產業／專業</h2><div className="needPills">{fields.map(x=><button key={x}>{x}</button>)}</div><small className="blockLabel">02 · 可公開資訊</small><div className="briefFields"><input placeholder="品牌／姓名"/><input placeholder="所在縣市"/><input placeholder="網站或社群（選填）"/><textarea placeholder="一句話說明你能提供的專業或服務"></textarea></div></div><aside className="networkJoinAside"><b>公開到什麼程度？</b><p>一般參觀者只能看到你選擇公開的品牌、產業與區域。私人電話、Email 與會員資料不會直接出現在 1% Network。</p><b>真正需要媒合時</b><p>由需求摘要先送到可能的節點；雙方都願意，才交換聯絡方式。</p><button onClick={()=>setSent(true)}>{sent?'已建立加入草稿 ✓':'加入 1% Network →'}</button></aside></div></section>
</main>}
