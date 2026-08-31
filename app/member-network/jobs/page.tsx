'use client';
import SiteHeader from '../../SiteHeader';
import {useState} from 'react';
const jobs=[['友善行政職','台北','正職','適合重返職場／二度就業'],['活動支援','新北','兼職','彈性排班'],['設計協作','遠端','接案','平面／社群素材'],['門市支援','桃園','兼職','銀髮友善']];
export default function Jobs(){const [applied,setApplied]=useState<string[]>([]);return <main className="directoryPage"><SiteHeader/>
<section className="memberNetHero"><div className="portalWrap"><div className="eyebrow">工作機會 · RCSCA 正式會員</div><h1>有時候，一份工作比一次物資更能讓生活重新站穩。</h1><p>企業提供工作機會也是 1%。職缺可包含正職、兼職、臨時工作、二度就業、銀髮友善與接案。</p></div></section>
<section className="portalSection"><div className="portalWrap"><div className="jobBoard">{jobs.map(j=><article key={j[0]}><div><small>{j[1]} · {j[2]}</small><h3>{j[0]}</h3><p>{j[3]}</p></div><button onClick={()=>setApplied([...applied,j[0]])}>{applied.includes(j[0])?'已送出意願 ✓':'我有興趣'}</button></article>)}</div></div></section></main>}
