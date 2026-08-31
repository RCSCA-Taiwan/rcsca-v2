'use client';
import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '../../../lib/supabase-browser';
const labels:Record<string,string>={draft:'草稿',submitted:'已送出',under_review:'評估中',needs_info:'需要補充',approved:'已核准',matched:'媒合中',completed:'已完成',rejected:'未通過',cancelled:'已取消'};
type Row={id:string;request_kind:string;title:string;status:string;updated_at:string;public_summary:string|null};
export default function LiveRequests(){
 const [loading,setLoading]=useState(true);const [signedIn,setSignedIn]=useState(false);const [rows,setRows]=useState<Row[]>([]);
 useEffect(()=>{(async()=>{const s=getSupabaseBrowserClient();const {data:{session}}=await s.auth.getSession();if(!session){setLoading(false);return;}setSignedIn(true);const {data}=await s.from('network_requests').select('id,request_kind,title,status,updated_at,public_summary').eq('requester_user_id',session.user.id).order('updated_at',{ascending:false});setRows((data||[]) as Row[]);setLoading(false);})();},[]);
 if(loading)return <p>正在讀取需求進度…</p>;
 if(!signedIn)return <div className="privacyCallout"><strong>請先登入</strong><p>登入後只會看到自己的需求與媒合進度。</p><a href="/login">前往登入 →</a></div>;
 if(!rows.length)return <div className="privacyCallout"><strong>目前沒有進行中的需求。</strong><p>需要找專業、工作或其他連結時，可以從共享專業網絡提出。</p><a href="/member-network/request">提出需求 →</a></div>;
 return <div className="stateList">{rows.map(r=><article key={r.id}><div className="stateMeta"><small>{r.request_kind}</small><span>{r.id.slice(0,8)}</span></div><h3>{r.title}</h3><div className="stateRow"><span className={`statusChip status-${r.status}`}>{labels[r.status]||r.status}</span><span>更新 {new Date(r.updated_at).toLocaleDateString('zh-TW')}</span></div>{r.public_summary&&<p>{r.public_summary}</p>}</article>)}</div>;
}
