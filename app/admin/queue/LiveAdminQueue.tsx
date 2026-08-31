'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {getSupabaseBrowserClient} from '../../../lib/supabase-browser';

type Row={kind:string;id:string;title:string;status:string;created_at:string;href:string;detail:string};
const label:Record<string,string>={submitted:'已送出',under_review:'審核中',needs_info:'待補資料',pending:'待核實',matched:'媒合中'};
export default function LiveAdminQueue(){
 const [loading,setLoading]=useState(true),[rows,setRows]=useState<Row[]>([]),[notice,setNotice]=useState('');
 useEffect(()=>{(async()=>{const s=getSupabaseBrowserClient();const {data:{session}}=await s.auth.getSession();if(!session){setNotice('請先使用具管理權限的帳號登入。');setLoading(false);return;}
  const [parts,shares,matches,cases]=await Promise.all([
   s.from('activity_participations').select('id,status,created_at,activities(name)').eq('status','pending').order('created_at',{ascending:true}).limit(30),
   s.from('enterprise_shares').select('id,title,status,created_at,enterprises(display_name,legal_name)').in('status',['submitted','under_review','needs_info']).order('created_at',{ascending:true}).limit(30),
   s.from('network_match_responses').select('id,status,created_at,note,network_requests(title)').in('status',['submitted','under_review','needs_info','matched']).order('created_at',{ascending:true}).limit(30),
   s.from('support_cases').select('id,title,status,created_at').in('status',['submitted','under_review','needs_info']).order('created_at',{ascending:true}).limit(30)
  ]);
  if([parts,shares,matches,cases].some(x=>x.error)){setNotice('目前帳號沒有完整後台權限，或部分工作佇列暫時無法讀取。');}
  const all:Row[]=[];
  for(const x of parts.data||[]) all.push({kind:'公益核實',id:x.id,title:(x as any).activities?.name||'公益活動參與',status:x.status,created_at:x.created_at,href:'/admin/verification',detail:'確認是否完成參與'});
  for(const x of shares.data||[]) all.push({kind:'企業共享',id:x.id,title:x.title,status:x.status,created_at:x.created_at,href:'/admin/partners',detail:(x as any).enterprises?.display_name||(x as any).enterprises?.legal_name||'企業'});
  for(const x of matches.data||[]) all.push({kind:'Network 媒合',id:x.id,title:(x as any).network_requests?.title||'媒合回應',status:x.status,created_at:x.created_at,href:'/admin/network',detail:'回應／補件／媒合完成'});
  for(const x of cases.data||[]) all.push({kind:'需求個案',id:x.id,title:x.title,status:x.status,created_at:x.created_at,href:'/admin/operations',detail:'限制資料，需個案管理權限'});
  all.sort((a,b)=>new Date(a.created_at).getTime()-new Date(b.created_at).getTime());setRows(all);setLoading(false);
 })()},[]);
 if(loading)return <div className="liveAccountLoading">正在整理後台工作佇列…</div>;
 return <>{notice&&<div className="workflowNotice">{notice}</div>}<div className="adminQueue">{rows.length?rows.map(r=><Link href={r.href} key={`${r.kind}-${r.id}`} className="adminQueueRow"><div><small>{r.kind}</small><strong>{r.title}</strong><span>{r.detail}</span></div><div><b>{label[r.status]||r.status}</b><time>{new Date(r.created_at).toLocaleDateString('zh-TW')}</time></div></Link>):<div className="emptyData">目前沒有待處理項目。</div>}</div></>;
}
