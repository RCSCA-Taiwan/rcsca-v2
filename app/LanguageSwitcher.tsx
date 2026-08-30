'use client';
import { useState } from 'react';
const langs=[['繁中','zh-Hant'],['EN','en'],['日本語','ja'],['한국어','ko']];
export default function LanguageSwitcher(){
 const [lang,setLang]=useState('zh-Hant');
 const choose=(v:string)=>{setLang(v);document.documentElement.lang=v;try{localStorage.setItem('rcsca-lang',v)}catch{}};
 return <div className="langSwitch" aria-label="語言切換">{langs.map(([label,v])=><button key={v} className={lang===v?'active':''} onClick={()=>choose(v)}>{label}</button>)}</div>;
}
