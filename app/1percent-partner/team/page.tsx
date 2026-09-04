'use client';
import SiteHeader from '../../SiteHeader';import LiveEnterpriseTeam from './LiveEnterpriseTeam';import {useI18n} from '../../i18n';
export default function EnterpriseTeamPage(){const {t}=useI18n();return <main className="directoryPage"><SiteHeader/><section className="partnerHero compactHero"><div className="portalWrap"><div className="eyebrow">1% PARTNER · {t('partner.team')}</div><h1>{t('partner.toolsTitle')}</h1><p>{t('partner.dashboardLead')}</p></div></section><LiveEnterpriseTeam/></main>}
