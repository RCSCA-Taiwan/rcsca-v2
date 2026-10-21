'use client';
import SiteHeader from '../SiteHeader';
import {useI18n} from '../i18n';
import {institutionCopy} from '../institutionCopy';
const liveCallout:any={
'zh-Hant':['正式營運中','本頁依實際網站功能、第三方服務與資料流程持續維護；若保存期間、法遵要求或服務範圍調整，將同步更新相關說明。'],
'en':['In production','This page is maintained against the live site, third-party services and actual data flows. Relevant language will be updated when retention periods, compliance requirements or service scope change.'],
'ja':['正式運用中','本ページは実際のサイト機能、第三者サービス、データフローに合わせて継続的に更新します。保存期間、法令対応、サービス範囲に変更がある場合は関連説明も更新します。'],
'ko':['정식 운영 중','이 페이지는 실제 사이트 기능, 제3자 서비스 및 데이터 흐름에 맞춰 지속적으로 관리됩니다. 보존 기간, 규정 준수 요구사항 또는 서비스 범위가 변경되면 관련 안내도 함께 업데이트합니다.']
};
export default function Page(){const {locale}=useI18n();const c=institutionCopy[locale].privacy;const callout=liveCallout[locale]??c.callout;return <main className="institutionPage"><SiteHeader/><section className="institutionHero compact"><div className="portalWrap"><div className="eyebrow">PRIVACY</div><h1>{c.title}</h1><p>{c.lead}</p></div></section><section className="portalSection"><div className="portalWrap legalCopy">{c.sections.map((s:any)=><div key={s[0]}><h2>{s[0]}</h2><p>{s[1]}</p></div>)}<div className="privacyCallout"><strong>{callout[0]}</strong><p>{callout[1]}</p></div></div></section></main>}
