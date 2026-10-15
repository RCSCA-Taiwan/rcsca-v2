'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {getDataRequestsClient} from '../../../../lib/data-requests-api';
import {changeLabels,dataRequestError,requestKinds,requestStatuses,type DataRequest} from '../../../../lib/data-requests';

export default function AdminDataRequests(){
 const[rows,setRows]=useState<DataRequest[]>([]),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false),[notice,setNotice]=useState(''),[busy,setBusy]=useState('');
 const[notes,setNotes]=useState<Record<string,string>>({}),[confirmed,setConfirmed]=useState<Record<string,boolean>>({});
 const lock=useRef(false);
 async function load(){setLoading(true);setFailed(false);try{const r=await getDataRequestsClient().rpc('admin_personal_data_requests');if(r.error)throw r.error;setRows(r.data as unknown as DataRequest[]);}catch{setFailed(true);}finally{setLoading(false);}}
 useEffect(()=>{void load();},[]);
 async function review(r:DataRequest,decision:string){if(lock.current)return;lock.current=true;setBusy(r.id);setNotice('');try{const result=await getDataRequestsClient().rpc('admin_personal_data_request_review',{p_request:r.id,p_decision:decision,p_note:notes[r.id]||'',p_execution_confirmed:!!confirmed[r.id]});if(result.error)throw result.error;setNotice(decision==='approved'?'申請已核准，尚未執行資料處理。':decision==='completed'?'已記錄管理員確認的處理完成結果。':'申請狀態已更新。');setConfirmed(x=>({...x,[r.id]:false}));setNotes(x=>({...x,[r.id]:''}));await load();}catch(e){setNotice(dataRequestError(e));}finally{lock.current=false;setBusy('');}}
 if(loading)return <p role="status">正在讀取資料申請…</p>;
 if(failed)return <div className="privacyCallout" role="alert">目前帳號沒有資料申請審核權限，或資料讀取失敗。<button onClick={()=>void load()}>重新讀取</button></div>;
 return <>{notice&&<p className="workflowNotice" role="status">{notice}</p>}
  <div className="privacyCallout"><strong>核准與執行分開記錄</strong><p>先確認本人意願、需處理範圍與未完成事項。全部重置的範圍包含個人資料、積分、XP、等級與足跡；刪除範圍與需保留紀錄須先向會員說明。此頁不會執行清除，請完成實際處理並核對後再結案。</p></div>
  <div className="partnerReviewList">{rows.length?rows.map(r=><article key={r.id}><div className="partnerReviewMain"><small>{requestStatuses[r.status]}</small><h2>{r.display_name||'會員'} · {requestKinds[r.request_kind]}</h2><p>申請原因：{r.reason}</p>{Object.entries(r.requested_changes).map(([k,v])=><p key={k}>{changeLabels[k]}：{v}</p>)}{r.request_kind==='reset'&&<p>申請範圍：個人資料、積分、XP、共享等級與共享足跡全部重置。</p>}{r.review_note&&<p>最近回覆：{r.review_note}</p>}<p>送出時間：{new Date(r.created_at).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})}</p>
  {!['completed','rejected','cancelled'].includes(r.status)&&<><label htmlFor={`note-${r.id}`}>處理說明（會員可查看）＊</label><textarea id={`note-${r.id}`} required maxLength={1000} value={notes[r.id]||''} disabled={!!busy} onChange={e=>setNotes(x=>({...x,[r.id]:e.target.value}))}/>{r.status==='processing'&&<label className="membershipCheck"><input type="checkbox" checked={!!confirmed[r.id]} disabled={!!busy} onChange={e=>setConfirmed(x=>({...x,[r.id]:e.target.checked}))}/>我已完成實際資料處理，核對申請範圍、積分與參與進度及需保留紀錄，並已在說明中記錄結果；此操作只記錄結案。</label>}</>}
  </div><div className="reviewActions">
  {r.status==='submitted'&&<><button disabled={!!busy||!notes[r.id]?.trim()} onClick={()=>void review(r,'approved')}>核准申請（尚未執行）</button><button disabled={!!busy||!notes[r.id]?.trim()} onClick={()=>void review(r,'needs_info')}>請會員補充資料</button></>}
  {r.status==='approved'&&<button disabled={!!busy||!notes[r.id]?.trim()} onClick={()=>void review(r,'processing')}>標示開始處理</button>}
  {r.status==='processing'&&<button disabled={!!busy||!notes[r.id]?.trim()||!confirmed[r.id]} onClick={()=>void review(r,'completed')}>記錄處理完成</button>}
  {['submitted','needs_info','approved'].includes(r.status)&&<button disabled={!!busy||!notes[r.id]?.trim()} className="dangerAction" onClick={()=>void review(r,'rejected')}>不予受理</button>}
  </div></article>):<p>目前沒有個人資料申請。</p>}</div><Link href="/admin/members">返回會員管理 →</Link></>;
}
