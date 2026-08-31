'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {getSupabaseBrowserClient} from '../../../lib/supabase-browser';

type Request={id:string;title:string;request_kind:string;status:string;public_summary:string|null;requester_enterprise_id:string|null;requester_user_id:string;created_at:string};
type Response={id:string;request_id:string;responder_user_id:string;message:string;status:string;contact_exchange_allowed:boolean;created_at:string};
type Consent={response_id:string;user_id:string;consented:boolean};
type Reveal={response_id:string;counterparty_display_name:string|null;counterparty_email:string|null;counterparty_mobile:string|null};
const statusLabel:Record<string,string>={submitted:'已送出',under_review:'審核中',needs_info:'待補資料',approved:'已核准',matched:'媒合中',completed:'已完成',rejected:'未通過',cancelled:'已取消'};

export default function LiveMatches(){
 const [loading,setLoading]=useState(true),[signedIn,setSignedIn]=useState(false),[uid,setUid]=useState('');
 const [requests,setRequests]=useState<Request[]>([]),[responses,setResponses]=useState<Response[]>([]),[consents,setConsents]=useState<Consent[]>([]),[reveals,setReveals]=useState<Reveal[]>([]);
 const [message,setMessage]=useState<Record<string,string>>({}),[notice,setNotice]=useState('');
 async function load(){
  const s=getSupabaseBrowserClient(); const {data:{session}}=await s.auth.getSession(); setSignedIn(!!session);
  if(!session){setLoading(false);return;} setUid(session.user.id);
  const [r,resp,c,reveal]=await Promise.all([
   s.from('network_requests').select('id,title,request_kind,status,public_summary,requester_enterprise_id,requester_user_id,created_at').order('created_at',{ascending:false}),
   s.from('network_match_responses').select('id,request_id,responder_user_id,message,status,contact_exchange_allowed,created_at').order('created_at',{ascending:false}),
   s.from('network_contact_consents').select('response_id,user_id,consented'),
   s.from('network_contact_reveals').select('response_id,counterparty_display_name,counterparty_email,counterparty_mobile')
  ]);
  setRequests((r.data||[]) as Request[]);setResponses((resp.data||[]) as Response[]);setConsents((c.data||[]) as Consent[]);setReveals((reveal.data||[]) as Reveal[]);setLoading(false);
 }
 useEffect(()=>{load()},[]);
 const responseByRequest=useMemo(()=>new Map(responses.map(x=>[x.request_id,x])),[responses]);
 async function reply(requestId:string){
  const text=(message[requestId]||'').trim(); if(!text)return; const s=getSupabaseBrowserClient(); const {data:{session}}=await s.auth.getSession(); if(!session)return;
  const {error}=await s.from('network_match_responses').insert({request_id:requestId,responder_user_id:session.user.id,message:text,status:'submitted',contact_exchange_allowed:false});
  if(error){setNotice(error.message.includes('duplicate')?'你已回應過這個需求。':'回應送出失敗，請稍後再試。');return;}
  setNotice('回應已送出。聯絡資料仍不會直接公開。'); setMessage(v=>({...v,[requestId]:''})); await load();
 }
 async function setConsent(responseId:string,consented:boolean){
  const s=getSupabaseBrowserClient(); const {data:{session}}=await s.auth.getSession(); if(!session)return;
  const {error}=await s.from('network_contact_consents').upsert({response_id:responseId,user_id:session.user.id,consented},{onConflict:'response_id,user_id'});
  if(error){setNotice('聯絡同意狀態更新失敗，請稍後再試。');return;}
  setNotice(consented?'已記錄你的同意。只有雙方都同意後，聯絡方式才會互相顯示。':'已撤回同意，聯絡方式將不再顯示。'); await load();
 }
 if(loading)return <div className="liveAccountLoading">正在讀取媒合狀態…</div>;
 if(!signedIn)return <div className="liveAccountGuest"><div><small>1% Network</small><strong>登入後查看我的媒合。</strong><p>私人需求、媒合回應與聯絡同意狀態不提供一般訪客瀏覽。</p></div><Link href="/login">登入 →</Link></div>;
 return <>{notice&&<div className="workflowNotice">{notice}</div>}<div className="matchList">{requests.length?requests.map(r=>{
  const resp=responseByRequest.get(r.id); const participant=resp && (resp.responder_user_id===uid || r.requester_user_id===uid); const myConsent=resp?consents.find(c=>c.response_id===resp.id&&c.user_id===uid)?.consented:false; const reveal=resp?reveals.find(x=>x.response_id===resp.id):undefined;
  return <article className="matchWorkflow" key={r.id}><div className="matchMain"><small>{r.request_kind}</small><h3>{r.title}</h3><p>{r.public_summary||'沒有公開摘要'} · {statusLabel[r.status]||r.status}</p>{resp&&<p className="responseState">媒合回應：{statusLabel[resp.status]||resp.status} · {resp.contact_exchange_allowed?'雙方已同意交換聯絡方式':'聯絡資料仍受保護'}</p>}
  {participant&&resp&&<div className="consentPanel"><div><strong>聯絡方式交換</strong><p>不是送出回應就公開電話。必須雙方各自同意。</p></div><button className={myConsent?'consented':''} onClick={()=>setConsent(resp.id,!myConsent)}>{myConsent?'撤回我的同意':'我同意交換聯絡方式'}</button></div>}
  {reveal&&<div className="contactReveal"><small>雙方已同意</small><strong>{reveal.counterparty_display_name||'媒合對象'}</strong><p>{reveal.counterparty_mobile||'未提供手機'}{reveal.counterparty_email?` · ${reveal.counterparty_email}`:''}</p></div>}</div>
  {!resp&&r.requester_user_id!==uid&&<div className="inlineReply"><textarea value={message[r.id]||''} onChange={e=>setMessage(v=>({...v,[r.id]:e.target.value}))} placeholder="簡短說明你可以提供的協助或資源"/><button onClick={()=>reply(r.id)}>送出回應</button></div>}
  </article>;}):<div className="emptyData">目前沒有你可查看的媒合需求。</div>}</div></>;
}
