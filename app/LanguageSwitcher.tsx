'use client';
import {useI18n,Locale} from './i18n';
const langs:[string,Locale][]=[['繁中','zh-Hant'],['EN','en'],['日本語','ja'],['한국어','ko']];
export default function LanguageSwitcher(){const {locale,setLocale}=useI18n();return <div className="langSwitch" aria-label="Language"><>{langs.map(([label,v])=><button type="button" key={v} aria-pressed={locale===v} className={locale===v?'active':''} onClick={()=>setLocale(v)}>{label}</button>)}</></div>}
