import SiteHeader from '../../SiteHeader';
import { getSupabaseReadiness } from '../../../lib/supabase/readiness';

const checks = [
  ['核心資料表','已建立 migration'],['RLS 權限基線','已建立'],['Auth 建立 profile','已建立 trigger'],
  ['活動核實 trusted function','已建立範例'],['Staging seed','已建立'],['真實會員資料','尚未匯入（正確）'],
  ['真實個案資料','尚未匯入（正確）'],['財務／金額','維持獨立，不進共享價值']
];
export default function DataReadiness(){ const s=getSupabaseReadiness(); return <main className="shell"><SiteHeader />
<section className="pageHero compactHero"><p className="eyebrow">後台｜資料準備</p><h1>先驗證權限，再讓真實資料進來。</h1><p className="lead">目前階段是資料庫施工與測試環境準備，不是正式上線匯入。</p></section>
<section className="sectionGrid twoCol"><article className="glassCard"><h2>資料層檢查</h2>{checks.map(([a,b])=><div className="statusRow" key={a}><span>{a}</span><strong>{b}</strong></div>)}</article><article className="glassCard"><h2>環境</h2><p>目前：<strong>{s.mode === 'prototype' ? '原型模式' : '測試環境可連線'}</strong></p><p>正式資料必須等 staging 權限測試通過後才匯入。</p></article></section>
</main>}
