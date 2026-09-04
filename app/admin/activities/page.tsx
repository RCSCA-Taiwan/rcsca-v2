import SiteHeader from '../../SiteHeader';
import LiveAdminActivities from './LiveAdminActivities';
export default function AdminActivities(){return <main className="adminPage"><SiteHeader/><section className="flowHero"><div className="portalWrap"><div className="eyebrow">公益行動管理</div><h1>公開活動必須先有正式主檔。</h1><p>活動名稱、期間、公開摘要與狀態集中管理；草稿與內部測試不會直接出現在公開網站。</p></div></section><section className="portalSection"><div className="portalWrap"><LiveAdminActivities/><div className="privacyCallout"><strong>活動主檔與個案資料分開。</strong><p>公開活動只描述行動本身；受服務者個資、聯絡資料與限制性個案內容不放進公開摘要。</p></div></div></section></main>}
