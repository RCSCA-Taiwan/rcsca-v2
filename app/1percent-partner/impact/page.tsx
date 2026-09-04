import SiteHeader from '../../SiteHeader';import LiveEnterpriseImpact from './LiveEnterpriseImpact';
import LiveESGAssets from './LiveESGAssets';
import LiveAnnualESGSummary from './LiveAnnualESGSummary';
import LiveAnnualReport from './LiveAnnualReport';
import LiveESGExport from './LiveESGExport';
import LiveEvidenceChain from './LiveEvidenceChain';
import LiveDeliveryReadiness from './LiveDeliveryReadiness';
import LiveFormalAnnualReport from './LiveFormalAnnualReport';
export default function Impact(){return <main className="partnerPage"><SiteHeader/><section className="partnerHero"><div className="portalWrap"><div><div className="eyebrow">企業影響力成果</div><h1>把做過的事，整理成可以被理解的成果。</h1><p>只整理已完成、可核實的企業共享足跡；不把捐款金額包裝成影響力，也不以受服務者的故事換曝光。</p></div></div></section><section className="portalSection"><div className="portalWrap"><LiveEnterpriseImpact/><LiveAnnualESGSummary/><LiveAnnualReport/><LiveDeliveryReadiness/><LiveFormalAnnualReport/><LiveEvidenceChain/><LiveESGExport/><LiveESGAssets/><div className="sectionHead"><div><div className="eyebrow">成果不是金額排名</div><h2>看見資源真正完成了什麼。</h2></div><p>資料由已核准共享與已完成媒合自動彙整；未完成、未核實的內容不列入成果。</p></div><div className="portalGrid three"><article><h3>行動紀錄</h3><p>專案、參與方式、完成狀態與可公開成果。</p></article><article><h3>資源流向</h3><p>產品、專業、服務、場地、工作機會等資源實際進入的位置。</p></article><article><h3>循環成果</h3><p>哪些合作進一步產生新的連結、工作、人才或下一個 1%。</p></article></div><div className="privacyCallout"><strong>公開與內部資料分開</strong><p>企業可取得自己的完整合作紀錄；公開頁只呈現經授權、去識別且適合公開的成果。</p></div></div></section></main>}
