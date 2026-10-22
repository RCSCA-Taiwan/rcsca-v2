'use client';
import SiteHeader from '../SiteHeader';import {useI18n} from '../i18n';import {institutionCopy} from '../institutionCopy';
const membershipPolicy:any={
'zh-Hant':'會費與認購金額不決定 XP 或共享等級；共享點依協會核實規則另行計算。經協會核實的捐款，每完整新台幣 1,000 元累積 1 共享點。',
'en':'Membership fees and purchase amounts do not determine XP or Sharing Level. Sharing Points are calculated separately under verified RCSCA rules; each complete NT$1,000 of a verified donation earns 1 Sharing Point.',
'ja':'会費や認購金額でXPや共有レベルは決まりません。共有ポイントはRCSCAの確認済みルールに基づき別途計算され、確認済み寄付は1,000台湾ドルごとに共有ポイント1点を付与します。',
'ko':'회비와 구매 금액은 XP 또는 공유 레벨을 결정하지 않습니다. 공유 포인트는 RCSCA의 확인 규칙에 따라 별도로 계산되며, 확인된 기부금은 NT$1,000 단위마다 공유 포인트 1점을 적립합니다.'
};
export default function Governance(){const {locale}=useI18n();const c=institutionCopy[locale].gov;const years=['2018–2020','2021–2023','2024–2026'];const chairs=['傅奇正','傅奇正','賈曙隆'];const rules=c.rules.map((r:any,i:number)=>i===2?[r[0],membershipPolicy[locale]??r[1]]:r);return <main className="institutionPage"><SiteHeader/><section className="institutionHero compact"><div className="portalWrap"><div className="eyebrow">GOVERNANCE</div><h1>{c.title}</h1><p>{c.lead}</p></div></section><section className="portalSection"><div className="portalWrap"><div className="portalGrid three">{years.map((y,i)=><article key={y}><small>{y}</small><h3>{c.terms[i]}</h3><p>{c.chair}{chairs[i]}</p></article>)}</div><div className="sectionHead"><div><div className="eyebrow">{c.data}</div><h2>{c.h2}</h2></div><p>{c.intro}</p></div><div className="governanceRules">{rules.map((r:any)=><div key={r[0]}><b>{r[0]}</b><span>{r[1]}</span></div>)}</div></div></section></main>}
