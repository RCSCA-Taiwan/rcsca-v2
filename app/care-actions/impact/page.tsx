import SiteHeader from '../../SiteHeader';
const rows=[
 ['偏鄉／育幼院','生活物資、節慶行動、陪伴','持續'],['單親家庭','生活需求與資源媒合','持續'],['年長者','生活支持與必要資源','依需求'],['新住民','生活連結與資源資訊','依需求'],['身障者','生活需求、專業與資源媒合','依需求']
];
export default function CareImpact(){return <main className="carePage"><SiteHeader/><section className="careHero"><div className="portalWrap"><div className="eyebrow">關懷足跡</div><h1>不賣慘，也能把十年做過的事說清楚。</h1><p>以服務類型、行動紀錄、完成狀態與必要成果呈現關懷；不要求受服務者用隱私或悲情故事交換資源。</p></div></section><section className="portalSection"><div className="portalWrap"><div className="careImpactTable"><div className="careImpactHead"><b>服務對象／場域</b><b>主要連結</b><b>狀態</b></div>{rows.map((r,i)=><div className="careImpactRow" key={i}><strong>{r[0]}</strong><span>{r[1]}</span><b>{r[2]}</b></div>)}</div><div className="sectionHead"><div><div className="eyebrow">我們公開什麼</div><h2>公開成果，不公開不必要的人生細節。</h2></div><p>正式資料會以可核實數字、行動與資源流向為主；個案故事只有在真正必要且取得適當同意時才使用。</p></div></div></section></main>}
