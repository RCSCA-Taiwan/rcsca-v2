import SiteHeader from '../../SiteHeader';
export default function Collaboration(){return <main className="collabPage"><SiteHeader/>
<section className="flowHero"><div className="portalWrap"><div className="eyebrow">企業合作怎麼進行</div><h1>不是先談贊助，而是先把企業想完成的事說清楚。</h1><p>RCSCA 將企業需求、真實社會需求、可用資源與執行條件放在同一張桌上，找出能真正落地的合作方式。</p></div></section>
<section className="portalSection"><div className="portalWrap"><div className="processRail">{[['01','企業提出目標','想做什麼、時間、對象、員工參與或成果需求。'],['02','需求與資源盤點','確認公益需求、合作夥伴、專業與執行條件。'],['03','共同設計方案','把 ESG、公益與企業資源轉成可執行計畫。'],['04','實際執行','活動、人力、物資、專業、工作機會或其他共享。'],['05','成果留下來','整理可追蹤成果與企業可使用的影響力資料。']].map(x=><article key={x[0]}><span>{x[0]}</span><h3>{x[1]}</h3><p>{x[2]}</p></article>)}</div></div></section>
<section className="portalSection darkPortal"><div className="portalWrap"><div className="sectionHead"><div><div className="eyebrow">合作底線</div><h2>受助者不是企業曝光的交換條件。</h2></div><p>企業可以委託專業企劃、執行與成果整理；但不因付費就取得特殊保護個案的影像、故事或私人資料。</p></div><a className="bigTextLink" href="/1percent-partner/esg">提出企業合作需求 →</a></div></section>
</main>}
