'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {getSupabaseBrowserClient} from '../../../lib/supabase-browser';
import {changeLabels,requestKinds,requestStatuses,type DataRequest} from '../../../lib/data-requests';

type AdminRow=DataRequest&{execution_summary?:Record<string,unknown>|null;executed_at?:string|null};

export default function LivePersonalDataRequests(){
 const [rows,setRows]=useState<AdminRow[]>([]),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false),[busy,setBusy]=useState(''),[message,setMessage]=useState('');
 const [notes,setNotes]=useState<Record<string,string>>({});
 const active=useRef(true);
 const load=useCallback(async()=>{
  setLoading(true);setFailed(false);
  try{
   const s=getSupabaseBrowserClient();
   const {data:{user},error:authError}=await s.auth.getUser();if(authError||!user)throw new Error('admin_required');
   const r=await s.rpc('admin_personal_data_requests');if(r.error)throw r.error;
   if(!active.current)return;
   const result=Array.isArray(r.data)?r.data as AdminRow[]:[];
   setRows(result.filter(row=>['submitted','needs_info','approved','processing'].includes(row.status)));
  }catch{if(active.current)setFailed(true);}finally{if(active.current)setLoading(false);}
 },[]);
 useEffect(()=>{active.current=true;void load();return()=>{active.current=false;};},[load]);
 async function review(row:AdminRow,decision:'needs_info'|'approved'|'processing'|'rejected'){
  const note=(notes[row.id]||'').trim();if(busy||!note)return;
  if(!window.confirm(`確定將「${requestKinds[row.request_kind]}」更新為「${decision==='approved'?'已核准':decision==='processing'?'處理中':decision==='needs_info'?'待補資料':'未通過'}」？`))return;
  setBusy(row.id);setMessage('');
  try{const s=getSupabaseBrowserClient();const r=await s.rpc('admin_personal_data_request_review',{p_request:row.id,p_decision:decision,p_note:note,p_execution_confirmed:false});if(r.error)throw r.error;setMessage('申請狀態已更新。');setNotes(v=>({...v,[row.id]:''}));await load();}catch{setMessage('操作未完成，請重新讀取後確認權限、狀態與審核說明。');}finally{setBusy('');}
 }
 async function execute(row:AdminRow){
  const note=(notes[row.id]||'').trim();if(busy||!note||row.status!=='processing')return;
  const impact=row.request_kind==='reset'?'這會清除目前個人資料、生日、聯絡資料與共享足跡，將可用積分歸零、等級回到起點並把會籍切為 inactive；正式入會歷史仍保留。':row.request_kind==='delete'?'這會停用網站個人檔案、清除目前可識別個資與共享進度、隱藏公開 Network／社群內容；必要會籍與稽核歷史仍保留。':'這會立即套用已核准的個人資料修改。';
  if(!window.confirm(`${impact}\n\n只有真正執行成功後才會標記「已完成」。確定執行？`))return;
  setBusy(row.id);setMessage('');
  try{const s=getSupabaseBrowserClient();const r=await s.rpc('admin_personal_data_request_execute',{p_request:row.id,p_note:note});if(r.error)throw r.error;setMessage('實際資料處理已成功完成，案件已標記為已完成。');setNotes(v=>({...v,[row.id]:''}));await load();}catch{setMessage('執行失敗；案件不會被標記為完成。請重新讀取後確認資料狀態。');}finally{setBusy('');}
 }
 if(loading)return <p role="status">正在讀取個人資料申請…</p>;
 if(failed)return <div className="workflowNotice" role="alert"><p>目前無法讀取個人資料申請，請確認管理權限後重試。</p><button onClick={()=>void load()}>重新讀取</button></div>;
 return <>
  <div className="privacyCallout"><strong>核准不等於執行</strong><p>重置／刪除案件必須先完成審核並進入「處理中」，再由本頁執行。資料庫只有在實際處理全部成功後才會寫入「已完成」。</p><p>刪除採隱私保護式停用：清除目前可識別資料與公開內容，但保留依法／營運所需的會籍、捐款與稽核歷史，不硬刪會員主鍵。</p></div>
  {message&&<p className="workflowNotice" role="status">{message}</p>}
  <button type="button" disabled={!!busy} onClick={()=>void load()}>重新讀取申請</button>
  <div className="partnerReviewList">
   {rows.length?rows.map(row=><article key={row.id}>
    <div className="partnerReviewMain"><small>{requestKinds[row.request_kind]} · {requestStatuses[row.status]}</small><h3>{row.display_name||'未設定顯示名稱'}</h3><p>{row.reason}</p>
    {Object.entries(row.requested_changes||{}).map(([key,value])=><p key={key}><b>{changeLabels[key]||key}</b>：{value}</p>)}
    {row.review_note&&<p>前次審核說明：{row.review_note}</p>}<p>送出：{new Date(row.created_at).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})}</p>
    <textarea aria-label={`處理說明-${row.id}`} maxLength={1000} placeholder="處理／審核說明（必填，請勿貼入身分證或其他敏感資料）" value={notes[row.id]||''} onChange={e=>setNotes(v=>({...v,[row.id]:e.target.value}))}/></div>
    <div className="reviewActions">
     {row.status==='submitted'&&<><button disabled={!!busy||!(notes[row.id]||'').trim()} onClick={()=>void review(row,'approved')}>{busy===row.id?'…':'核准申請'}</button><button className="secondaryAction" disabled={!!busy||!(notes[row.id]||'').trim()} onClick={()=>void review(row,'needs_info')}>請補資料</button><button className="dangerAction" disabled={!!busy||!(notes[row.id]||'').trim()} onClick={()=>void review(row,'rejected')}>未通過</button></>}
     {row.status==='needs_info'&&<button className="dangerAction" disabled={!!busy||!(notes[row.id]||'').trim()} onClick={()=>void review(row,'rejected')}>結束並未通過</button>}
     {row.status==='approved'&&<><button disabled={!!busy||!(notes[row.id]||'').trim()} onClick={()=>void review(row,'processing')}>{busy===row.id?'…':'開始實際處理'}</button><button className="dangerAction" disabled={!!busy||!(notes[row.id]||'').trim()} onClick={()=>void review(row,'rejected')}>取消核准／未通過</button></>}
     {row.status==='processing'&&<button className={row.request_kind==='edit'?'':'dangerAction'} disabled={!!busy||!(notes[row.id]||'').trim()} onClick={()=>void execute(row)}>{busy===row.id?'執行中…':'確認執行並完成'}</button>}
    </div>
   </article>):<div className="emptyData">目前沒有待處理的個人資料申請。</div>}
  </div>
 </>;
}
