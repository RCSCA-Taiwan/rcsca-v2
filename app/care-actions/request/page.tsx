'use client';
import SiteHeader from '../../SiteHeader';
import {useState} from 'react';
const types=['生活物資','教育／兒少','就業／工作','專業服務','緊急生活缺口','其他'];
export default function RequestCare(){const [sent,setSent]=useState(false);return <main className="flowPage"><SiteHeader/>
<section className="flowHero"><div className="portalWrap"><div className="eyebrow">提出真實需求</div><h1>制度接不到，不代表需求不存在。</h1><p>這裡不是公開求助牆。完整資料只進入 RCSCA 內部評估；公開媒合只使用必要的匿名摘要。</p></div></section>
<section className="portalSection"><div className="portalWrap careRequestGrid"><div><small>需求類型</small><div className="needGrid">{types.map(x=><label key={x}><input type="checkbox"/><span>{x}</span></label>)}</div><div className="briefFields"><input placeholder="聯絡人"/><input placeholder="手機"/><input placeholder="所在縣市"/><textarea placeholder="請簡單說明目前遇到的狀況與實際缺口"></textarea></div><button className="submitLead" onClick={()=>setSent(true)}>{sent?'已建立需求草稿 ✓':'提出需求 →'}</button></div><aside className="privacyAside"><b>不公開貼出完整故事</b><p>地址、家庭細節、健康與其他敏感資料維持受控權限。</p><b>接受不代表虧欠</b><p>未來若有能力再次分享自己的 1%，是新的參與，不是還債，也不要求等值。</p></aside></div></section></main>}
