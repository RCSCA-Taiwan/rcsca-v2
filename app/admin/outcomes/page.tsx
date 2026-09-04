import AdminPageIntro from '../AdminPageIntro';import SiteHeader from '../../SiteHeader';
import Link from 'next/link';
import LiveOutcomeQueue from './LiveOutcomeQueue';
import LiveOutcomeDrafts from './LiveOutcomeDrafts';
import LiveESGEvidenceWorkbench from './LiveESGEvidenceWorkbench';
export default function Page(){return <main className="adminPage"><SiteHeader/><section className="container section"><div className="eyebrow">RCSCA 後台</div><h1>成果整理工作區</h1><p className="lead">完成一件事，不等於立刻拿去宣傳。這裡先判斷它是否適合形成善循環案例、企業 ESG 素材，或只保留為內部共享足跡。</p><LiveOutcomeQueue/><LiveOutcomeDrafts/><LiveESGEvidenceWorkbench/><p><Link href="/admin/queue">← 回統一工作佇列</Link></p></section></main>}
