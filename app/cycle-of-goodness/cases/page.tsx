import SiteHeader from '../../SiteHeader';
const cases=[
 {title:'一份工作，讓角色開始改變',steps:['企業提供友善工作機會','RCSCA 連結真實就業需求','生活逐步穩定','當事人未來以自己的專業提供新的 1%']},
 {title:'一個專業，補上另一個人的缺口',steps:['會員提出生活專業需求','1% Network 找到合適節點','雙方同意後建立連結','新的信任關係再回到共享網絡']},
 {title:'一次被接住，不等於永遠是受惠者',steps:['真實缺口被看見','個人／企業資源進到需要的位置','不要求曝光、不要求等值回報','未來有能力時，以自己的方式重新進入 Cycle']}
];
export default function Cases(){return <main className="casePage"><SiteHeader/><section className="caseHero"><div className="portalWrap"><div className="eyebrow">善循環 · 真實機制</div><h1>善循環不是一句口號，而是角色與資源真的開始流動。</h1><p>以下用機制案例說明：同一個人在不同時間可以分享，也可能需要被接住；企業、專業與公益需求也會彼此交會。</p></div></section><section className="portalSection"><div className="portalWrap"><div className="caseList">{cases.map((c,idx)=><article key={c.title}><span>0{idx+1}</span><h2>{c.title}</h2><div className="caseSteps">{c.steps.map((s,i)=><div key={s}><b>{i+1}</b><p>{s}</p>{i<c.steps.length-1&&<i>→</i>}</div>)}</div></article>)}</div></div></section></main>}
