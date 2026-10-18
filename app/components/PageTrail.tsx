"use client";
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useI18n} from '../i18n';
import {SECTION_PARENTS,pageLabel} from '../../lib/site-navigation.mjs';
export default function PageTrail(){
 const path=usePathname();const {locale}=useI18n();
 if(path==='/'||locale!=='zh-Hant')return null;
 const parent=SECTION_PARENTS.find(([prefix])=>path===prefix||path.startsWith(prefix+'/'));
 const current=pageLabel(path);if(!current)return null;
 return <nav className="pageTrail" aria-label="目前位置"><Link href="/">首頁</Link><span aria-hidden="true">／</span>
 {parent?.[2]&&parent[2]!==path&&<><Link href={parent[2]}>{parent[1]}</Link><span aria-hidden="true">／</span></>}
 <span aria-current="page">{current}</span><Link className="trailGuide" href="/guide">找功能 →</Link></nav>;
}
