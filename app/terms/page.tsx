'use client';
import SiteHeader from '../SiteHeader';
import {useI18n} from '../i18n';
import {institutionCopy} from '../institutionCopy';
const pointsPolicy:any={
'zh-Hant':'XP、共享點與等級用於記錄參與與平台內回饋，不是貨幣、投資商品、薪酬或可兌現資產。經協會核實的捐款，每完整新台幣 1,000 元累積 1 共享點；會費本身不轉換為 XP 或共享點。捐款徽章與 XP 另依協會正式核定政策。',
'en':'XP, Sharing Points and levels record participation and in-platform recognition. They are not currency, investments, compensation or cashable assets. Each complete NT$1,000 of a donation verified by RCSCA earns 1 Sharing Point; membership fees do not themselves convert into XP or Sharing Points. Donation badges and XP remain subject to separately approved association policy.',
'ja':'XP・共有ポイント・レベルは参加記録とプラットフォーム内の還元のためのもので、通貨・投資商品・報酬・換金資産ではありません。RCSCA が確認した寄付は1,000台湾ドルごとに共有ポイント1点を付与します。会費そのものはXPや共有ポイントには変換されません。寄付バッジとXPは協会が別途正式に定める方針に従います。',
'ko':'XP, 공유 포인트와 레벨은 참여 기록과 플랫폼 내 보상을 위한 것이며 통화, 투자상품, 급여 또는 현금화 자산이 아닙니다. RCSCA가 확인한 기부금은 NT$1,000 단위마다 공유 포인트 1점을 적립합니다. 회비 자체는 XP나 공유 포인트로 전환되지 않습니다. 기부 배지와 XP는 협회가 별도로 확정한 정책을 따릅니다.'
};
export default function Page(){const {locale}=useI18n();const c=institutionCopy[locale].terms;const sections=c.sections.map((s:any,i:number)=>i===1?[s[0],pointsPolicy[locale]??s[1]]:s);return <main className="institutionPage"><SiteHeader/><section className="institutionHero compact"><div className="portalWrap"><div className="eyebrow">USE PRINCIPLES</div><h1>{c.title}</h1><p>{c.lead}</p></div></section><section className="portalSection"><div className="portalWrap legalCopy">{sections.map((s:any)=><div key={s[0]}><h2>{s[0]}</h2><p>{s[1]}</p></div>)}</div></section></main>}
