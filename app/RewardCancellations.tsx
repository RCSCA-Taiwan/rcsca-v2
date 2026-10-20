'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useOwnedRecords,verifiedRecordsClient} from './components/useOwnedRecords';
import {getFulfillmentClient} from '../lib/reward-fulfillment-api';
import {slotTime} from '../lib/reward-fulfillment';
import './fulfillment.css';
type Cancellation={redemption_id:string;title:string;point_cost:number;redemption_status:string;fulfillment_type:string;can_request:boolean;can_review:boolean;status:'submitted'|'approved'|'rejected'|'withdrawn'|null;reason:string|null;review_note:string|null;points_expires_at:string|null;refunded_points:number|null;refunded_available:number|null};
const labels={submitted:'取消審核中',approved:'取消已核准',rejected:'取消未通過',withdrawn:'已撤回取消申請'};
function errorText(error:unknown){
 const message=(error as {message?:string})?.message||'';
 if(message.includes('independent_admin_required'))return '須由另一位授權管理員審核，不能審核自己的取消申請。';
 if(message.includes('cancellation_requires_unfulfilled'))return '訂單已出貨或服務已開始，請改用履約問題回報。';
 if(message.includes('cancellation_already_pending'))return '這筆訂單已在取消審核中，請重新讀取。';
 if(message.includes('cancellation_note_required'))return '請填寫申請原因或審核說明。';
 return '操作未完成，請重新讀取並確認訂單進度與權限後再試。';
}
const validCancellation=(r:Cancellation)=>!!r&&typeof r.redemption_id==='string'&&typeof r.title==='string'&&typeof r.point_cost==='number'&&Number.isFinite(r.point_cost)&&typeof r.redemption_status==='string'&&typeof r.can_request==='boolean'&&typeof r.can_review==='boolean'&&(r.status===null||['submitted','approved','rejected','withdrawn'].includes(r.status))&&(['reason','review_note','points_expires_at'] as const).every(key=>r[key]===null||typeof r[key]==='string')&&(['refunded_points','refunded_available'] as const).every(key=>r[key]===null||typeof r[key]==='number');
export default function RewardCancellations({manage=false}:{manage?:boolean}){
 const[busy,setBusy]=useState(''),[notice,setNotice]=useState(''),[actionError,setActionError]=useState('');
 const read=useCallback((s:ReturnType<typeof getFulfillmentClient>)=>s.rpc('reward_cancellation_list',{p_manage:manage}),[manage]);
 const {rows,loading,failed,userId,load}=useOwnedRecords<Cancellation>(read,validCancellation);
 const[notes,setNotes]=useState<Record<string,string>>({}),[confirmed,setConfirmed]=useState<Record<string,boolean>>({});
 const lock=useRef(false);
 useEffect(()=>{const refresh=(event:Event)=>{if((event as CustomEvent).detail?.source!=='cancellation')void load();};window.addEventListener('reward-cancellation-updated',refresh);return()=>window.removeEventListener('reward-cancellation-updated',refresh);},[load]);
 async function reload(){await load();window.dispatchEvent(new CustomEvent('reward-cancellation-updated',{detail:{source:'cancellation'}}));}
 async function act(row:Cancellation,action:'submit'|'withdraw'|'approve'|'reject'){
  if(lock.current||busy||loading||failed||!userId||!rows?.some(r=>r.redemption_id===row.redemption_id))return;
  const note=notes[row.redemption_id]?.trim()||'';
  if(action==='submit'&&(manage||!row.can_request||row.status==='submitted'||!note))return;
  if(action==='withdraw'&&(manage||row.status!=='submitted'))return;
  if(['approve','reject'].includes(action)&&(!manage||!row.can_review||row.status!=='submitted'||!note))return;
  if(action==='approve'&&(!confirmed[row.redemption_id]||!row.can_request))return;
  const question=action==='submit'?'送出取消申請？送審後暫停履約，核准前不退點。':action==='approve'?'核准取消並退回原效期積分？原兌換碼將失效，已到期積分仍不可使用。':action==='reject'?'確定不通過此取消申請，並恢復原訂單履約？':'撤回取消申請並恢復原訂單履約？';
  if(!window.confirm(question))return;
  lock.current=true;setBusy(row.redemption_id);setNotice('');setActionError('');
  try{const s=await verifiedRecordsClient(userId);const result=await s.rpc('reward_cancellation_action',{p_redemption:row.redemption_id,p_action:action,p_note:notes[row.redemption_id]||''});if(result.error)throw result.error;
   setNotice(action==='submit'?'取消申請已送審，核准前不退點。':action==='approve'?'取消已核准，退點保留原效期；已到期部分不可使用。':'取消申請進度已更新。');
   setNotes(x=>({...x,[row.redemption_id]:''}));setConfirmed(x=>({...x,[row.redemption_id]:false}));
   await reload();
  }catch(error){setActionError(errorText(error));}finally{lock.current=false;setBusy('');}
 }
 return <section className="fulfillmentOrders" aria-label="兌換取消與退點" aria-busy={!!busy||loading}><h2>{manage?'取消申請與退點審核':'兌換取消申請'}</h2>
 <p>限尚未核銷、尚未出貨或服務開始前的訂單。取消須經管理員審核；退回積分保留原效期。審核期間暫停履約，XP 與公益參與紀錄不受影響。</p>
 {notice&&<p className="workflowNotice" role="status">{notice}</p>}
 <button className="recordsRetry" disabled={!!busy||loading} onClick={()=>void reload()}>重新讀取取消申請</button>
 {actionError&&<p className="workflowNotice" role="alert">{actionError}</p>}
 {loading?<p role="status">正在讀取取消申請…</p>:failed?<div className="privacyCallout" role="alert">目前無法讀取取消申請，請重新讀取。</div>:!userId?<p>請先登入具操作權限的帳號。</p>:!rows?.length?<p>目前沒有可取消的訂單或取消申請。</p>:rows.map(row=><article className="membershipCard" key={row.redemption_id}><div className="membershipCardHead"><h3>取消申請：{row.title}</h3><strong>{row.status?labels[row.status]:'已核准兌換'}</strong></div>
 <p>{row.point_cost} 共享點 · 訂單編號 {row.redemption_id}</p>
 {row.reason&&<p>取消原因：{row.reason}</p>}{row.review_note&&<p>審核說明：{row.review_note}</p>}
 {row.status==='submitted'&&<p>等待審核中，暫停核銷、出貨與服務完成操作。</p>}
 {row.status==='approved'&&<><p>已記錄退回 {row.refunded_points} 點；目前仍在原效期內 {row.refunded_available} 點（實際可用餘額以錢包為準）。原兌換碼已失效。</p>{row.points_expires_at&&<p>原積分到期時間：{slotTime(row.points_expires_at)}（台灣時間）</p>}</>}
 <div className="fulfillmentActions">
 {!manage&&row.can_request&&row.status!=='submitted'&&<><label>取消原因＊<textarea aria-label="取消原因＊" maxLength={1000} value={notes[row.redemption_id]||''} disabled={!!busy} onChange={e=>setNotes(x=>({...x,[row.redemption_id]:e.target.value}))}/></label><button disabled={!!busy||!notes[row.redemption_id]?.trim()} onClick={()=>void act(row,'submit')}>送出取消申請</button></>}
 {!manage&&row.status==='submitted'&&<button disabled={!!busy} onClick={()=>void act(row,'withdraw')}>撤回取消申請</button>}
 {!manage&&!row.can_request&&row.redemption_status==='approved'&&row.status!=='submitted'&&<p>目前進度不適用取消送審，請在下方訂單回報履約問題。</p>}
 {manage&&row.status==='submitted'&&(row.can_review?<><label>審核說明＊<textarea aria-label="審核說明＊" maxLength={1000} value={notes[row.redemption_id]||''} disabled={!!busy} onChange={e=>setNotes(x=>({...x,[row.redemption_id]:e.target.value}))}/></label><label className="membershipCheck"><input type="checkbox" checked={!!confirmed[row.redemption_id]} disabled={!!busy} onChange={e=>setConfirmed(x=>({...x,[row.redemption_id]:e.target.checked}))}/>已確認尚未核銷／出貨／開始服務，並了解退點保留原效期。</label><button disabled={!!busy||!notes[row.redemption_id]?.trim()||!confirmed[row.redemption_id]||!row.can_request} onClick={()=>void act(row,'approve')}>核准取消並退點</button><button disabled={!!busy||!notes[row.redemption_id]?.trim()} onClick={()=>void act(row,'reject')}>不通過取消申請</button></>:<p>此取消申請由另一位授權管理員審核。</p>)}
 </div></article>)}
 </section>;
}
