'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {getDataRequestsClient} from '../../../lib/data-requests-api';
import {changeLabels,dataRequestError,requestKinds,requestStatuses,type DataRequest} from '../../../lib/data-requests';
import './data-requests.css';

export default function PersonalDataRequests(){
 const [rows,setRows]=useState<DataRequest[]>([]),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false),[signed,setSigned]=useState(false);
 const [kind,setKind]=useState<DataRequest['request_kind']>('edit'),[reason,setReason]=useState(''),[changes,setChanges]=useState<Record<string,string>>({}),[editing,setEditing]=useState<string|null>(null);
 const [notice,setNotice]=useState(''),[actionError,setActionError]=useState(''),[busy,setBusy]=useState(false),[step,setStep]=useState(0),[ack,setAck]=useState(false);
 const lock=useRef(false),dialog=useRef<HTMLDialogElement>(null),request=useRef(0),owner=useRef<string|null>(null);
 const load=useCallback(async()=>{
  const sequence=++request.current;setLoading(true);setFailed(false);
  try{
   const s=getDataRequestsClient();const{data,error}=await s.auth.getUser();if(error)throw error;
   if(sequence!==request.current)return;
   if(!data.user){owner.current=null;setSigned(false);setRows([]);setEditing(null);setReason('');setChanges({});setStep(0);return;}
   if(owner.current&&owner.current!==data.user.id){setRows([]);setEditing(null);setReason('');setChanges({});setKind('edit');setStep(0);setNotice('');setActionError('');}owner.current=data.user.id;setSigned(true);
   const r=await s.rpc('personal_data_requests_self');if(r.error)throw r.error;
   if(sequence!==request.current)return;
   const result=r.data as unknown;
   if(!Array.isArray(result)||!result.every((row:DataRequest)=>row&&typeof row.id==='string'&&Object.hasOwn(requestKinds,row.request_kind)&&Object.hasOwn(requestStatuses,row.status)&&typeof row.reason==='string'&&typeof row.created_at==='string'&&row.requested_changes!==null&&typeof row.requested_changes==='object'&&!Array.isArray(row.requested_changes)&&Object.entries(row.requested_changes).every(([key,value])=>Object.hasOwn(changeLabels,key)&&typeof value==='string')&&(row.review_note===null||typeof row.review_note==='string')))throw new Error('unreadable_requests');
   setRows(result as DataRequest[]);
  }catch{if(sequence===request.current)setFailed(true);}finally{if(sequence===request.current)setLoading(false);}
 },[]);
 useEffect(()=>{void load();return()=>{request.current++;};},[load]);
 useEffect(()=>{if(step&&dialog.current&&!dialog.current.open)dialog.current.showModal();},[step]);
 const open=rows.find(r=>['submitted','needs_info','approved','processing'].includes(r.status));
 const ready=!loading&&!failed&&signed;
 const editable=editing?open?.id===editing&&open.status==='needs_info':!open;
 const staleEditing=editing&&!rows.some(r=>r.id===editing&&r.status==='needs_info');
 function clearDraft(){setStep(0);setAck(false);setKind('edit');setReason('');setChanges({});setEditing(null);}
 async function verifiedClient(){const s=getDataRequestsClient();const {data,error}=await s.auth.getUser();if(error||!data.user||data.user.id!==owner.current)throw new Error('authentication_required');return s;}
 async function submit(confirmed=false){if(lock.current||busy||!ready||!editable||(kind==='edit'&&step!==0)||(kind!=='edit'&&(!confirmed||step!==2||!ack)))return;lock.current=true;setBusy(true);setNotice('');setActionError('');try{const s=await verifiedClient();const filtered=Object.fromEntries(Object.entries(changes).filter(([,v])=>v.trim()));const r=await s.rpc('personal_data_request_submit',{p_kind:kind,p_changes:kind==='edit'?filtered:{},p_reason:reason,p_confirm_one:confirmed,p_confirm_two:confirmed,p_request:editing});if(r.error)throw r.error;clearDraft();setNotice('申請已送出。協會核准並完成處理前，資料與進度不會因這次送出而變更。');await load();}catch(e){setActionError(dataRequestError(e));setStep(0);setAck(false);}finally{lock.current=false;setBusy(false);}}
 function begin(e:FormEvent){e.preventDefault();if(lock.current||busy||!ready||!editable||step)return;if(kind==='edit'){void submit();return;}setAck(false);setStep(1);}
 async function cancel(id:string){if(lock.current||busy||!ready||step||!rows.some(r=>r.id===id&&['submitted','needs_info'].includes(r.status)))return;lock.current=true;setBusy(true);setNotice('');setActionError('');try{const s=await verifiedClient();const r=await s.rpc('personal_data_request_cancel',{p_request:id});if(r.error)throw r.error;clearDraft();setNotice('申請已撤回。');await load();}catch(e){setActionError(dataRequestError(e));}finally{lock.current=false;setBusy(false);}}
 function supplement(row:DataRequest){if(lock.current||busy||!ready||step||row.status!=='needs_info')return;setNotice('');setActionError('');setEditing(row.id);setKind(row.request_kind);setReason(row.reason);setChanges(row.requested_changes);}
 return <div className="dataRequestWorkspace" aria-busy={loading||busy}>
  <div className="privacyCallout"><strong>送出申請不會立即變更資料</strong><p>協會會先確認身分、範圍與未完成事項，再處理資料。核准與實際執行是兩個階段，處理結果可在本頁追蹤。</p><p>一般資料修改保留積分與參與進度。全部重置包含個人資料、可用積分、XP、共享等級與共享足跡；原始正式入會與必要審核紀錄保留供協會核對。刪除申請的範圍與需保留紀錄會由協會說明。</p><p>請勿填寫密碼、身分證字號或付款資料。登入信箱與密碼請至<Link href="/account/security">安全設定</Link>管理。</p></div>
  {loading&&<p role="status">正在讀取個人資料申請…</p>}
  {!loading&&failed&&<div role="alert" className="privacyCallout">目前無法讀取申請紀錄。請重新讀取後再操作。</div>}
  {!loading&&!failed&&!signed&&<Link href="/login?next=%2Faccount%2Fdata-requests">登入後管理自己的資料申請 →</Link>}
  {actionError&&<p className="workflowNotice" role="alert">{actionError}</p>}
  {notice&&<p className="workflowNotice" role="status">{notice}</p>}
  <button className="dataRequestRefresh" type="button" disabled={loading||busy||step>0} onClick={()=>{setNotice('');setActionError('');void load();}}>重新讀取資料申請進度</button>
  {ready&&<section aria-label="資料申請進度"><h2>申請進度</h2>{rows.length?rows.map(r=><article className="membershipCard" key={r.id}><h3>{requestKinds[r.request_kind]}</h3><strong>{requestStatuses[r.status]}</strong><p>{r.reason}</p>{Object.entries(r.requested_changes).map(([key,value])=><p key={key}>{changeLabels[key]}：{value}</p>)}{r.review_note&&<p>協會回覆：{r.review_note}</p>}<p>送出時間：{new Date(r.created_at).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})}</p>{['submitted','needs_info'].includes(r.status)&&<button disabled={busy||step>0} onClick={()=>void cancel(r.id)}>撤回申請</button>}{r.status==='needs_info'&&<button disabled={busy||step>0} onClick={()=>supplement(r)}>補充資料</button>}</article>):<p>目前沒有資料申請。</p>}</section>}
  {ready&&staleEditing&&<div className="privacyCallout" role="status">原申請狀態已更新，這份補件表單已停止編輯，請查看上方最新進度。<button type="button" onClick={clearDraft}>返回最新申請進度</button></div>}
  {ready&&editable&&<form className="authForm dataRequestForm" aria-label="個人資料申請" onSubmit={begin}>
   <h2>{editing?'補充申請資料':'提出申請'}</h2>
   <fieldset disabled={busy||step>0}><legend>申請內容</legend><label>申請項目<select aria-label="申請項目" value={kind} onChange={e=>setKind(e.target.value as typeof kind)}>{Object.entries(requestKinds).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
   {kind==='edit'&&<><p>只填寫需要修改的欄位；空白欄位不申請變更。若要清除某欄資料，請在原因內說明。</p>{Object.entries(changeLabels).map(([key,label])=><label key={key}>{label}<input type={key==='contact_email'?'email':key==='mobile'?'tel':'text'} maxLength={key==='address'?500:key==='contact_email'?254:key==='mobile'?30:100} value={changes[key]||''} onChange={e=>setChanges(x=>({...x,[key]:e.target.value}))}/></label>)}</>}
   {kind==='reset'&&<p className="dataRequestDanger">申請全部重置：個人資料需重新填寫，可用積分、XP 與足跡歸零，共享等級回到起點，重新提出會員申請。核准前不會重置。</p>}
   {kind==='delete'&&<p className="dataRequestDanger">申請刪除帳號及個人資料。處理完成後可能無法登入、兌換或使用原有權益；協會將先確認刪除範圍及需保留的紀錄。</p>}
   <label>申請原因或補充說明＊<textarea aria-label="申請原因或補充說明＊" required maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label>
   <button disabled={busy||step>0}>{busy?'正在送出…':kind==='edit'?'送出資料修改申請':'繼續確認申請'}</button></fieldset>
   {editing&&<button type="button" disabled={busy||step>0} onClick={clearDraft}>取消本次補件編輯</button>}
  </form>}
  <nav className="dataRequestRoutes" aria-label="資料申請後續操作"><Link href="/account/profile">返回個人資料與生日 →</Link><Link href="/account/notifications">查看審核與進度通知 →</Link><Link href="/account/security">登入信箱與密碼設定 →</Link><Link href="/account">返回我的入口 →</Link></nav>
  {step>0&&<dialog ref={dialog} className="dataRequestDialog" aria-labelledby="data-request-warning" onCancel={e=>{e.preventDefault();if(!busy)setStep(0);}}>
    <h2 id="data-request-warning">{step===1?'第一次提醒':'第二次確認'}：{requestKinds[kind]}</h2>
    {kind==='reset'?<p>此申請要求個人資料重新填寫，並將可用積分、XP、共享足跡歸零、共享等級回到起點。完成處理後不能保證恢復原有進度；原始正式入會與必要審核紀錄仍會保留。</p>:<p>此申請要求刪除帳號資料。完成處理後可能失去登入與原有會員服務、積分及參與進度；協會將確認可刪除範圍並說明需保留的紀錄。</p>}
    <p>{step===1?'現在只進入申請確認；尚未送出，也不會執行清除。':'確認後只送出審核申請；協會完成審核與實際處理前，資料不會因送出而被清除。'}</p>
    <label className="membershipCheck"><input type="checkbox" checked={ack} disabled={busy} onChange={e=>setAck(e.target.checked)}/>{step===1?'我已了解本次申請的完整影響':'我再次確認上述範圍，並要求送交協會審核'}</label>
    <div className="dataRequestActions"><button type="button" disabled={busy} onClick={()=>{if(!lock.current){setStep(0);setAck(false);}}}>取消，保留原資料</button><button type="button" disabled={!ack||busy} onClick={()=>{if(!ack||busy||lock.current)return;if(step===1){setAck(false);setStep(2);}else void submit(true);}}>{busy?'送出中…':step===1?'繼續第二次確認':'確認送出審核申請'}</button></div>
  </dialog>}
 </div>;
}
