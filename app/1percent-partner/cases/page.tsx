import SiteHeader from '../../SiteHeader';
const cases=[
 {tag:'員工參與',title:'把一次企業志工，變成可延續的共享計畫',text:'從需求盤點、參與設計、現場執行到成果整理，讓員工知道自己的時間實際去了哪裡。'},
 {tag:'資源媒合',title:'企業原本就有的資源，也可能正好補上一個缺口',text:'產品、場地、專業、工作機會或服務，先確認用途，再媒合到真正需要的位置。'},
 {tag:'影響力成果',title:'不消費受助故事，也能留下可信任的成果',text:'以完成事項、參與人次、服務範圍與可驗證紀錄整理成果，避免把弱勢處境當成宣傳素材。'}
];
export default function Cases(){return <main><SiteHeader/><section className="partnerHero"><div className="portalWrap"><div className="eyebrow">企業合作案例模型</div><h1>企業要看的，不只是理念，而是怎麼真正做成。</h1><p>以下先以流程模型呈現；正式上線後只使用經授權、可公開的真實合作案例。</p></div></section><section className="portalSection"><div className="portalWrap"><div className="caseEditorial">{cases.map((c,i)=><article key={c.title}><span>0{i+1}</span><div><small>{c.tag}</small><h2>{c.title}</h2><p>{c.text}</p></div></article>)}</div><div className="caseLead"><div><small>有明確需求？</small><strong>先告訴我們企業想完成什麼。</strong></div><a href="/1percent-partner/esg">提出企業合作需求 →</a></div></div></section></main>}
