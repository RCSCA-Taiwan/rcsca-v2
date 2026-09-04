'use client';
import Link from 'next/link';
import SiteHeader from './SiteHeader';
import {useI18n} from './i18n';
export default function NotFound(){const {t}=useI18n();return <main className="flowPage"><SiteHeader/><section className="flowHero"><div className="portalWrap"><div className="eyebrow">404 · RCSCA</div><h1>{t('system.notFoundTitle')}</h1><p>{t('system.notFoundLead')}</p><div className="heroActions"><Link className="button" href="/">{t('system.home')}</Link><Link className="button secondary" href="/contact">{t('system.help')}</Link></div></div></section></main>}
