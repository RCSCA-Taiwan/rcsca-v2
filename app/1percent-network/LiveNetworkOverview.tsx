'use client';
import {useEffect,useMemo,useState} from 'react';
import {getSupabaseBrowserClient} from '../../lib/supabase-browser';
import {useI18n} from '../i18n';

const baseline=['室內設計','餐飲','法律','旅宿','交通運輸','寵物服務','醫療照護','教育'];
type Row={id:string;category:string;display_name:string;region:string|null;public_description:string|null;website_url:string|null};
type Node={name:string;count:number;region:string;names:string[];offers:string[];state:'active'|'scarce'|'empty'};

export default function LiveNetworkOverview(){
  const {t}=useI18n();
  const [rows,setRows]=useState<Row[]>([]); const [loading,setLoading]=useState(true); const [sel,setSel]=useState(0); const [filter,setFilter]=useState<'all'|'scarce'|'empty'>('all');
  useEffect(()=>{(async()=>{try{const s=getSupabaseBrowserClient();const {data}=await s.from('network_profiles').select('id,category,display_name,region,public_description,website_url').eq('status','approved').eq('public_visible',true);setRows((data||[]) as Row[])}finally{setLoading(false)}})()},[]);
  const data=useMemo<Node[]>(()=>{const cats=Array.from(new Set([...baseline,...rows.map(r=>r.category)])).slice(0,8);return cats.map(name=>{const rs=rows.filter(r=>r.category===name);const regionMap=new Map<string,number>();rs.forEach(r=>{if(r.region)regionMap.set(r.region,(regionMap.get(r.region)||0)+1)});const region=regionMap.size?Array.from(regionMap).map(([k,v])=>`${k} ${v}`).join(' · '):'目前無公開節點';return {name,count:rs.length,region,names:rs.map(r=>r.display_name).slice(0,6),offers:rs.map(r=>r.public_description||'').filter(Boolean).slice(0,4),state:rs.length===0?'empty':rs.length<=1?'scarce':'active'} as Node})},[rows]);
  const visible=useMemo(()=>data.map((x,i)=>({...x,i})).filter(x=>filter==='all'||x.state===filter),[data,filter]);
  useEffect(()=>{if(sel>=data.length)setSel(0)},[data.length,sel]); const d=data[sel]||data[0];
  const activeCount=data.filter(x=>x.count>0).length, scarce=data.filter(x=>x.state==='scarce').length, empty=data.filter(x=>x.state==='empty').length;
  if(!d)return null;
  return <>
    <section className="networkHero"><div className="portalWrap"><div className="eyebrow">1% NETWORK · 共享專業網絡</div><h1>{t('network.hero')}</h1><p>{t('network.lead')}</p><div className="networkStats"><span><b>{data.length}</b> {t('network.nodes')}</span><span><b>{rows.length}</b> {t('network.publicPartners')}</span><span><b>{scarce}</b> {t('network.scarce')}</span><span><b>{empty}</b> {t('network.waiting')}</span></div></div></section>
    <section className="networkMapSection"><div className="portalWrap"><div className="networkFilter"><span>{loading?t('network.loading'):t('network.filter')}</span>{[['all',t('network.all')],['scarce',t('network.scarceShort')],['empty',t('network.waiting')]].map(x=><button key={x[0]} className={filter===x[0]?'active':''} onClick={()=>setFilter(x[0] as any)}>{x[1]}</button>)}</div><div className="networkWorkbench"><div className="networkMap"><div className="netCenter"><b>1</b><i>%</i><small>共享網絡</small></div>{visible.map(x=><button key={x.name} onClick={()=>setSel(x.i)} className={`industryNode node-${x.i+1} ${x.state} ${sel===x.i?'selected':''}`}><b>{x.name}</b><span>{x.count?`${x.count} 個公開節點`:'等待第一個 1%'}</span></button>)}<svg className="netLines" viewBox="0 0 800 650" preserveAspectRatio="none"><g>{[[400,325,170,95],[400,325,395,55],[400,325,650,120],[400,325,700,330],[400,325,625,545],[400,325,390,590],[400,325,125,520],[400,325,90,290]].map((l,i)=><line key={i} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]}/>)}</g></svg></div><aside className="networkDetail"><small>{d.state==='empty'?'等待加入':d.state==='scarce'?'目前稀缺':'已連結'}</small><h2>{d.name}</h2><strong>{d.count} 個公開節點</strong><p>{d.region}</p>{d.names.length?<><div className="partnerNames">{d.names.map(n=><span key={n}>{n}</span>)}</div><div className="networkOffers"><small>公開分享內容</small>{d.offers.map((o,i)=><b key={`${o}-${i}`}>{o}</b>)}</div></>:<div className="emptyInvite"><b>成為這個產業的第一個 1%。</b><p>沒有獨家名額，也不販售席位；你的專業只是把這塊共享網絡補起來。</p></div>}<a className="networkCta" href={d.count?'/1percent-network/directory':'/1percent-network/join'}>{d.count?'查看公開夥伴 →':'加入這個節點 →'}</a></aside></div></div></section>
  </>
}
