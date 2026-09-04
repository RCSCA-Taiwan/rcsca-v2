'use client';
import SiteHeader from '../SiteHeader';
import {useI18n} from '../i18n';
import {institutionCopy} from '../institutionCopy';
export default function Page(){const {locale}=useI18n();const c=institutionCopy[locale].privacy;return <main className="institutionPage"><SiteHeader/><section className="institutionHero compact"><div className="portalWrap"><div className="eyebrow">PRIVACY</div><h1>{c.title}</h1><p>{c.lead}</p></div></section><section className="portalSection"><div className="portalWrap legalCopy">{c.sections.map((s:any)=><div key={s[0]}><h2>{s[0]}</h2><p>{s[1]}</p></div>)}<div className="privacyCallout"><strong>{c.callout[0]}</strong><p>{c.callout[1]}</p></div></div></section></main>}
