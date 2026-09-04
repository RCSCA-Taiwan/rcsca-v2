'use client';
import {useI18n} from './i18n';
export default function Loading(){const {t}=useI18n();return <main className="systemStatePage" aria-live="polite" aria-busy="true"><section className="systemStateCard"><div className="eyebrow">RCSCA</div><h1>{t('system.loadingTitle')}</h1><p>{t('system.loadingLead')}</p></section></main>}
