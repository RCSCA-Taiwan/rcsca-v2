'use client';

import Link from 'next/link';
import {useEffect,useMemo,useState} from 'react';
import {getSupabaseBrowserClient} from '../../../lib/supabase-browser';

type Request={id:string;title:string;request_kind:string;status:string;public_summary:string|null;requester_enterprise_id:string|null;requester_user_id:string;created_at:string;is_owner:boolean;has_responded:boolean};
type Response={id:string;request_id:string;responder_user_id:string;message:string;status:string;contact_exchange_allowed:boolean;created_at:string};
type Consent={response_id:string;user_id:string;consented:boolean};
type Reveal={response_id:string;counterparty_display_name:string|null;counterparty_email:string|null;counterparty_mobile:string|null};
type Tab='全部'|'我提出的'|'可回應'|'已參與';
type ReadState={requests:boolean;responses:boolean;consents:boolean;reveals:boolean};

const tabs:Tab[]=['全部','我提出的','可回應','已參與'];
const statusLabel:Record<string,string>={submitted:'已送出',under_review:'審核中',needs_info:'待補資料',approved:'已核准',matched:'媒合中',completed:'已完成',rejected:'未通過',cancelled:'已取消'};
const activeStatuses=new Set(['approved','matched']);
const cleanReadState:ReadState={requests:true,responses:true,consents:true,reveals:true};

export default function LiveMatches(){
 const [loading,setLoading]=useState(true),[signedIn,setSignedIn]=useState(false),[eligible,setEligible]=useState(true),[uid,setUid]=useState(''),[tab,setTab]=useState<Tab>('全部');
 const [requests,setRequests]=useState<Request[]>([]),[responses,setResponses]=useState<Response[]>([]),[consents,setConsents]=useState<Consent[]>([]),[reveals,setReveals]=useState<Reveal[]>([]);
 const [message,setMessage]=useState<Record<string,string>>({}),[actionNotice,setActionNotice]=useState(''),[readState,setReadState]=useState<ReadState>(cleanReadState),[busy,setBusy]=useState('');

 async function load(){
  setLoading(true);
  try{
   const s=getSupabaseBrowserClient();
   const {data:{session},error:authError}=await s.auth.getSession();
   if(authError) throw authError;
   setSignedIn(!!session);
   if(!session){setUid('');setReadState(cleanReadState);return;}
   setUid(session.user.id);
   const membership=await s.rpc('is_active_member');
   if(membership.error){setReadState({...cleanReadState,requests:false});return}
   if(!membership.data){setEligible(false);setReadState(cleanReadState);return}
   setEligible(true);
   const [requestResult,responseResult,consentResult,revealResult]=await Promise.all([
    s.rpc('network_list_matchable_requests'),
    s.from('network_match_responses').select('id,request_id,responder_user_id,message,status,contact_exchange_allowed,created_at').order('created_at',{ascending:false}),
    s.from('network_contact_consents').select('response_id,user_id,consented'),
    s.from('network_contact_reveals').select('response_id,counterparty_display_name,counterparty_email,counterparty_mobile')
   ]);
   const nextReadState={requests:!requestResult.error,responses:!responseResult.error,consents:!consentResult.error,reveals:!revealResult.error};
   setReadState(nextReadState);
   if(!requestResult.error)setRequests((requestResult.data||[]) as Request[]);
   if(!responseResult.error)setResponses((responseResult.data||[]) as Response[]);
   if(!consentResult.error)setConsents((consentResult.data||[]) as Consent[]);
   if(!revealResult.error)setReveals((revealResult.data||[]) as Reveal[]);
  }catch{setReadState({requests:false,responses:false,consents:false,reveals:false})}finally{setLoading(false)}
 }

 useEffect(()=>{void load()},[]);
 const grouped=useMemo(()=>{const map=new Map<string,Response[]>();responses.forEach(response=>map.set(response.request_id,[...(map.get(response.request_id)||[]),response]));return map},[responses]);
 const filtered=useMemo(()=>requests.filter(request=>tab==='全部'||(tab==='我提出的'&&request.is_owner)||(tab==='可回應'&&!request.is_owner&&!request.has_responded&&activeStatuses.has(request.status))||(tab==='已參與'&&request.has_responded)),[requests,tab]);
 const readFailed=Object.values(readState).some(value=>!value);
 const readNotice=!readState.requests?'目前無法讀取媒合需求，既有畫面不會被當成空資料。':!readState.responses?'部分媒合回應目前無法讀取；為避免重複操作，回應與狀態操作暫停。':!readState.consents?'聯絡同意狀態目前無法完整讀取；同意操作暫停。':!readState.reveals?'聯絡資料交換結果目前無法完整讀取。':'';

 async function getVerifiedSession(){
  const s=getSupabaseBrowserClient();
  const {data:{session},error}=await s.auth.getSession();
  if(error||!session||session.user.id!==uid)return null;
  return {s,session};
 }
 async function reply(id:string){
  const text=(message[id]||'').trim();if(!text||busy||!readState.requests||!readState.responses)return;
  setBusy(`reply:${id}`);
  try{const verified=await getVerifiedSession();if(!verified){setActionNotice('登入狀態已變更，請重新登入後再操作。');return}const {error}=await verified.s.rpc('network_submit_response',{p_request_id:id,p_message:text});setActionNotice(error?(error.code==='23505'?'你已回應過這個需求。':'回應送出失敗，請稍後再試。'):'回應已送出。聯絡資料仍不會直接公開。');if(!error){setMessage(value=>({...value,[id]:''}));await load()}}finally{setBusy('')}
 }
 async function setConsent(id:string,value:boolean){
  if(busy||!readState.responses||!readState.consents)return;
  setBusy(`consent:${id}`);
  try{const verified=await getVerifiedSession();if(!verified){setActionNotice('登入狀態已變更，請重新登入後再操作。');return}const {error}=await verified.s.rpc('network_set_contact_consent',{p_response_id:id,p_consented:value});setActionNotice(error?'聯絡同意狀態更新失敗，請稍後再試。':value?'已記錄你的同意。只有雙方都同意後才會交換聯絡方式。':'已撤回同意。');if(!error)await load()}finally{setBusy('')}
 }
 async function decide(id:string,decision:'matched'|'rejected'|'cancelled'|'completed'){
  if(busy||!readState.responses)return;
  setBusy(`decision:${id}`);
  try{const verified=await getVerifiedSession();if(!verified){setActionNotice('登入狀態已變更，請重新登入後再操作。');return}const {error}=await verified.s.rpc('decide_network_response',{p_response_id:id,p_decision:decision});setActionNotice(error?'狀態更新失敗，請稍後再試。':'媒合狀態已更新。');if(!error)await load()}finally{setBusy('')}
 }

 if(loading&&!requests.length)return <div className="liveAccountLoading" role="status">正在讀取媒合狀態…</div>;
 if(!signedIn)return <div className="liveAccountGuest"><div><small>1% Network</small><strong>登入後查看我的媒合。</strong><p>私人需求、媒合回應與聯絡同意狀態不提供一般訪客瀏覽。</p></div><Link href="/login">登入 →</Link></div>;
 if(!eligible)return <div className="liveAccountGuest"><div><small>正式會員功能</small><strong>深層媒合只開放有效會員。</strong><p>你仍可在「我的需求與進度」查看過去紀錄；正式會員身份由 RCSCA 核實。</p></div><Link href="/account/identity">查看身份 →</Link></div>;

 return <>
  <div className="matchTabs" role="tablist" aria-label="媒合篩選">{tabs.map(item=><button type="button" role="tab" aria-selected={tab===item} key={item} className={tab===item?'active':''} onClick={()=>setTab(item)}>{item}</button>)}</div>
  {readFailed?<div className="workflowNotice"><p role="alert">{readNotice}</p><button type="button" className="secondaryAction" disabled={loading||!!busy} onClick={()=>void load()}>{loading?'重新讀取中…':'重新讀取媒合狀態'}</button></div>:null}
  {actionNotice?<div className="workflowNotice" role="status" aria-live="polite">{actionNotice}</div>:null}
  <div className="matchList">{filtered.length?filtered.map(request=>{const requestResponses=grouped.get(request.id)||[];const mine=requestResponses.find(response=>response.responder_user_id===uid);return <article className="matchWorkflow" key={request.id}><div className="matchMain"><small>{request.request_kind}</small><h3>{request.title}</h3><p>{request.public_summary||'沒有公開摘要'} · {statusLabel[request.status]||request.status}</p>{readState.responses?requestResponses.map(response=>{const participant=response.responder_user_id===uid||request.requester_user_id===uid;if(!participant)return null;const myConsent=consents.find(consent=>consent.response_id===response.id&&consent.user_id===uid)?.consented||false;const reveal=reveals.find(item=>item.response_id===response.id);const actionBusy=busy.endsWith(response.id);return <div className="responseState" key={response.id}><p><strong>媒合回應：</strong>{statusLabel[response.status]||response.status}</p><p>{response.message}</p>{request.requester_user_id===uid&&response.status==='submitted'?<div className="reviewActions"><button type="button" disabled={actionBusy||!!busy} onClick={()=>decide(response.id,'matched')}>接受媒合</button><button type="button" disabled={actionBusy||!!busy} className="secondaryAction" onClick={()=>decide(response.id,'rejected')}>婉拒</button></div>:null}{response.responder_user_id===uid&&response.status==='submitted'?<button type="button" disabled={actionBusy||!!busy} className="secondaryAction" onClick={()=>decide(response.id,'cancelled')}>撤回回應</button>:null}{response.status==='matched'?<button type="button" disabled={actionBusy||!!busy} onClick={()=>decide(response.id,'completed')}>標記已完成</button>:null}{['submitted','matched','completed'].includes(response.status)&&readState.consents?<div className="consentPanel"><div><strong>聯絡方式交換</strong><p>必須雙方各自同意，才顯示聯絡資料。</p></div><button type="button" disabled={actionBusy||!!busy} className={myConsent?'consented':''} onClick={()=>setConsent(response.id,!myConsent)}>{myConsent?'撤回我的同意':'我同意交換聯絡方式'}</button></div>:null}{readState.reveals&&reveal?<div className="contactReveal"><small>雙方已同意</small><strong>{reveal.counterparty_display_name||'媒合對象'}</strong><p>{reveal.counterparty_mobile||'未提供手機'}{reveal.counterparty_email?` · ${reveal.counterparty_email}`:''}</p></div>:null}</div>}):null}</div>{readState.requests&&readState.responses&&!request.has_responded&&!mine&&!request.is_owner&&activeStatuses.has(request.status)?<div className="inlineReply"><textarea aria-label={`回應 ${request.title}`} disabled={!!busy} value={message[request.id]||''} onChange={event=>setMessage(value=>({...value,[request.id]:event.target.value}))} placeholder="簡短說明你可以提供的協助或資源"/><button type="button" disabled={!!busy} onClick={()=>reply(request.id)}>{busy===`reply:${request.id}`?'送出中…':'送出回應'}</button></div>:null}</article>}):readState.requests?<div className="emptyData">目前沒有符合這個分類的媒合需求。</div>:null}</div>
 </>;
}
