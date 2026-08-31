'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import LanguageSwitcher from './LanguageSwitcher';
const OneMark=()=> <span className="oneMark brandOne"><b>1</b><i>%</i></span>;
export default function SiteHeader(){
 const path=usePathname();
 const active=(p:string)=>path===p||path.startsWith(p+'/');
 return <header className="nav"><div className="navInner">
  <Link className="brandLockup" href="/" aria-label="回到 RCSCA 首頁"><span className="brandStack"><span className="brandRcsca">RCSCA</span><small>Cycle of Goodness</small></span><span className="brandCross">×</span><OneMark/></Link>
  <nav>
   <Link className={active('/my-1percent')?'navActive':''} href="/my-1percent"><span className="navEn">MY 1%</span><span className="navZh">我的共享</span></Link>
   <Link className={active('/1percent-partner')?'navActive':''} href="/1percent-partner"><span className="navEn">1% PARTNER</span><span className="navZh">企業夥伴</span></Link>
   <Link className={active('/care-actions')?'navActive':''} href="/care-actions"><span className="navEn">CARE</span><span className="navZh">公益行動</span></Link>
   <Link className={active('/1percent-network')?'navActive':''} href="/1percent-network"><span className="navEn">1% NETWORK</span><span className="navZh">共享網絡</span></Link>
   <Link className={active('/cycle-of-goodness')?'navActive':''} href="/cycle-of-goodness"><span className="navEn">CYCLE</span><span className="navZh">善循環</span></Link>
   <LanguageSwitcher/>
   <Link className="navAccount" href="/account"><span className="navZh">我的入口</span></Link>
  </nav>
 </div></header>
}
