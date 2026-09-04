'use client';
import SiteHeader from '../../SiteHeader';
import LiveNotifications from './LiveNotifications';
import {useI18n} from '../../i18n';
export default function Notifications(){const {t}=useI18n();return <main className="statePage"><SiteHeader/><section className="flowHero compactHero"><div className="portalWrap"><div className="eyebrow">{t('account.notifications')}</div><h1>{t('notification.title')}</h1><p>{t('notification.lead')}</p></div></section><section className="portalSection"><div className="portalWrap"><LiveNotifications/></div></section></main>}
