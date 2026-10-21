import SiteHeader from '../../SiteHeader';
const years=[
  ['2026','中秋弱勢家庭物資認購','已完成 · 100 戶'],
  ['每年','農曆年前台北文化體驗＋共享感恩晚會','固定行動'],
  ['2023','育幼院孩童球鞋贈送','已完成'],
  ['2018.07.22','首次花蓮育幼院參訪','協會首次外地關懷行動']
];
export default function Archive(){return <main><SiteHeader/><section className="careHero"><div className="portalWrap"><div className="eyebrow">關懷行動紀錄</div><h1>不靠悲情堆疊，也能清楚留下做過的事。</h1><p>公開的是行動、需求、完成狀態與必要成果；受服務者的隱私與尊嚴優先。</p></div></section><section className="portalSection"><div className="portalWrap"><div className="archiveList">{years.map((x,i)=><article key={i}><b>{x[0]}</b><h3>{x[1]}</h3><span>{x[2]}</span></article>)}</div></div></section></main>}
