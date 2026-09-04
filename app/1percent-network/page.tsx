'use client';
import SiteHeader from '../SiteHeader';
import LiveNetworkOverview from './LiveNetworkOverview';
import {useI18n} from '../i18n';
export default function Network(){const {t}=useI18n();return <main className="networkPage"><SiteHeader/><LiveNetworkOverview/>
<section className="networkQuickActions"><div className="portalWrap"><a href="/1percent-network/directory"><b>{t('network.viewPartners')}</b><span>{t('network.viewPartnersDesc')}</span></a><a href="/1percent-network/join"><b>{t('network.join')}</b><span>{t('network.joinDesc')}</span></a></div></section>
<section className="networkAccess"><div className="portalWrap"><div><small>{t('network.public')}</small><strong>{t('network.publicDesc')}</strong></div><div><small>{t('network.deep')}</small><strong>{t('network.deepDesc')}</strong></div><a href="/1percent-network/matches">{t('network.matches')}</a></div></section></main>}
