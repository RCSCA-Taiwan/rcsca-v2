'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import LanguageSwitcher from './LanguageSwitcher';
import {useI18n} from './i18n';
const OneMark=()=> <span className="oneMark brandOne"><b>1</b><i>%</i></span>;
const NavLinks=({mobile=false}:{mobile?:boolean})=> {const {t}=useI18n();return <>
 <Link href="/my-1percent"><span className="navEn">MY 1%</span><span className="navZh">{t('nav.my')}</span></Link>
 <Link href="/1percent-partner"><span className="navEn">1% PARTNER</span><span className="navZh">{t('nav.partner')}</span></Link>
 <Link href="/care-actions"><span className="navEn">CARE</span><span className="navZh">{t('nav.care')}</span></Link>
 <Link href="/1percent-network"><span className="navEn">1% NETWORK</span><span className="navZh">{t('nav.network')}</span></Link>
 <Link href="/cycle-of-goodness"><span className="navEn">CYCLE</span><span className="navZh">{t('nav.cycle')}</span></Link>
 {!mobile&&<LanguageSwitcher/>}
 <Link className="navAccount" href="/account"><span className="navZh">{t('nav.account')}</span></Link>
</>};
export default function SiteHeader(){
 const path=usePathname(); const {t}=useI18n();
 const active=(p:string)=>path===p||path.startsWith(p+'/');
 return <header className="nav"><div className="navInner">
  <Link className="brandLockup" href="/" aria-label={t('system.home')}><span className="brandStack"><span className="brandRcsca">RCSCA</span><small>Cycle of Goodness</small></span><span className="brandCross">×</span><OneMark/></Link>
  <nav className="desktopNav">
   <Link className={active('/my-1percent')?'navActive':''} href="/my-1percent"><span className="navEn">MY 1%</span><span className="navZh">{t('nav.my')}</span></Link>
   <Link className={active('/1percent-partner')?'navActive':''} href="/1percent-partner"><span className="navEn">1% PARTNER</span><span className="navZh">{t('nav.partner')}</span></Link>
   <Link className={active('/care-actions')?'navActive':''} href="/care-actions"><span className="navEn">CARE</span><span className="navZh">{t('nav.care')}</span></Link>
   <Link className={active('/1percent-network')?'navActive':''} href="/1percent-network"><span className="navEn">1% NETWORK</span><span className="navZh">{t('nav.network')}</span></Link>
   <Link className={active('/cycle-of-goodness')?'navActive':''} href="/cycle-of-goodness"><span className="navEn">CYCLE</span><span className="navZh">{t('nav.cycle')}</span></Link>
   <LanguageSwitcher/>
   <Link className="navAccount" href="/account"><span className="navZh">{t('nav.account')}</span></Link>
  </nav>
  <details className="mobileMenu"><summary aria-label={t('nav.go')}><span></span><span></span><span></span></summary><div className="mobileMenuPanel"><div className="mobileMenuHead"><b>{t('nav.go')}</b><small>RCSCA · Cycle of Goodness</small></div><NavLinks mobile/><div className="mobileLang"><span>{t('nav.language')}</span><LanguageSwitcher/></div></div></details>
 </div></header>
}
