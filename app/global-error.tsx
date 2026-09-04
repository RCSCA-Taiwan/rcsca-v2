'use client';
import {useEffect,useState} from 'react';
type Locale='zh-Hant'|'en'|'ja'|'ko';
const copy:Record<Locale,{title:string;lead:string;retry:string;home:string}>={
 'zh-Hant':{title:'網站暫時無法載入',lead:'你的資料不會因這個畫面自動重複送出。請重新嘗試；若問題持續發生，可稍後再回來。',retry:'重新嘗試',home:'回首頁 →'},
 en:{title:'The site could not be loaded',lead:'Your data will not be submitted again automatically because of this screen. Try again, or return later if the problem continues.',retry:'Try again',home:'Back home →'},
 ja:{title:'サイトを読み込めませんでした',lead:'この画面によってデータが自動的に重複送信されることはありません。再試行し、問題が続く場合は時間を置いて戻ってください。',retry:'再試行',home:'ホームへ →'},
 ko:{title:'사이트를 불러오지 못했습니다',lead:'이 화면으로 인해 데이터가 자동으로 중복 제출되지는 않습니다. 다시 시도하고 문제가 계속되면 잠시 후 돌아와 주세요.',retry:'다시 시도',home:'홈으로 →'}
};
export default function GlobalError({reset}:{error:Error&{digest?:string},reset:()=>void}){const[locale,setLocale]=useState<Locale>('zh-Hant');useEffect(()=>{try{const saved=localStorage.getItem('rcsca-lang') as Locale|null;if(saved&&['zh-Hant','en','ja','ko'].includes(saved))setLocale(saved)}catch{}},[]);const c=copy[locale];return <html lang={locale}><body><main className="systemStatePage"><section className="systemStateCard" role="alert"><div className="eyebrow">RCSCA</div><h1>{c.title}</h1><p>{c.lead}</p><div className="heroActions"><button className="primary" onClick={reset} autoFocus>{c.retry}</button><a className="textLink" href="/">{c.home}</a></div></section></main></body></html>}
