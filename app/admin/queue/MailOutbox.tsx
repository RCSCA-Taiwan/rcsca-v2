'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {getSupabaseBrowserClient} from '../../../lib/supabase-browser';
import {reviewMailKinds} from '../../../lib/admin-mail-outbox.mjs';
import './mail-outbox.css';
type Item={id:string;source_kind:string;state:string;attempts:number;failure_code:string|null;created_at:string;retry_after:string};
type Queue={manual_enabled:boolean;automatic_enabled:false;items:Item[];counts:Record<string,number>};
const states:Record<string,string>={pending:'待交寄',sending:'交寄中',accepted:'服務已接受交寄',failed:'交寄失敗',unknown:'結果不明，須核對信箱',cancelled:'已取消通知'};
const failures:Record<string,string>={authentication_failed:'帳密驗證被拒絕',connection_failed:'連線失敗',connection_timeout:'連線逾時',tls_failed:'加密連線失敗',rejected:'服務拒絕交寄',unconfirmed:'尚未確認是否交寄成功'};
const messages:Record<string,string>={updated:'手動交寄設定已更新。',retry_queued:'已排回待交寄，仍需主動按「交寄下一封通知」。',retry_unavailable:'目前不能重試，可能尚在冷卻、已達上限或待辦狀態已變更，請重新讀取。',send_accepted:'寄信服務已接受交寄；實際收到仍需到信箱確認。',send_failed:'本次交寄失敗，已保留紀錄，請先檢查寄信設定。',send_unknown:'結果不明，請先核對信箱；這封信不會自動重寄。',nothing_due:'目前沒有可交寄的通知，請以最新佇列為準。',claim_unavailable:'尚未啟用手動交寄，或目前無法取得待寄通知。',not_configured:'寄信設定尚未完成。',invalid_gmail_password:'寄信憑證格式不符，請核對設定。',action_rejected:'未完成收信確認或設定變更被拒絕。',unavailable:'無法讀取通知佇列，請重新讀取。'};
export default function MailOutbox(){
 const [queue,setQueue]=useState<Queue|null>(null),[unavailable,setUnavailable]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[confirmed,setConfirmed]=useState(false);
 const lock=useRef(false),alive=useRef(true);
 const request=useCallback(async(body?:Record<string,unknown>)=>{
  const {data:{session}}=await getSupabaseBrowserClient().auth.getSession();
  if(!session)throw new Error('unavailable');
  return fetch('/api/admin/mail/outbox',{method:body?'POST':'GET',headers:{Authorization:`Bearer ${session.access_token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store'});
 },[]);
 const load=useCallback(async()=>{
  const response=await request();
  if(response.status===401||response.status===403){if(alive.current){setQueue(null);setUnavailable(false);}return;}
  const data=await response.json();
  if(!response.ok||!Array.isArray(data.items))throw new Error('unavailable');
  if(alive.current){setQueue(data);setUnavailable(false);}
 },[request]);
 useEffect(()=>{alive.current=true;void load().catch(()=>{if(alive.current)setUnavailable(true);});return()=>{alive.current=false;};},[load]);
 async function act(body?:Record<string,unknown>){
  if(lock.current)return;lock.current=true;setBusy(true);setNotice('');
  try{
   if(body){const response=await request(body);const result=await response.json();if(alive.current)setNotice(messages[result.state]||'操作結果尚未確認，請先重新讀取並核對信箱。');}
   await load();
  }catch{if(alive.current){setUnavailable(true);setNotice(body?.action==='send_next'?messages.send_unknown:messages.unavailable);}}
  finally{lock.current=false;if(alive.current)setBusy(false);}
 }
 function retry(item:Item){
  if(lock.current)return;
  if(item.state==='unknown'&&!window.confirm('這封通知可能已寄出。請先查看收件匣與垃圾郵件；再次交寄仍可能重複。確認已核對，仍要排入重試？'))return;
  void act({action:'retry',id:item.id,duplicate_checked:item.state==='unknown'});
 }
 if(!queue&&!unavailable)return null;
 return <section className="privacyCallout mailOutbox" id="mail-outbox" aria-labelledby="mail-outbox-title">
  <h2 id="mail-outbox-title">審核通知寄送佇列</h2>
  <p>只記錄本次更新上線後新送出或重新送審的八類申請，不補寄既有待辦。信件僅含類別與後台入口，不含姓名或個案內容。</p>
  <p><strong>自動寄送尚未啟用。</strong>啟用手動交寄後，每按一次只處理一封通知，不會整批寄出。</p>
  {unavailable&&<p role="alert">通知清單尚未確認完整，請重新讀取。</p>}
  <button disabled={busy} onClick={()=>void act()}>重新讀取通知佇列</button>
  {queue&&<>
   <p>待交寄 {queue.counts.pending||0} · 交寄中 {queue.counts.sending||0} · 已交寄 {queue.counts.accepted||0} · 失敗 {queue.counts.failed||0} · 結果不明 {queue.counts.unknown||0}</p>
   {!queue.manual_enabled&&<label className="mailReceiptConfirm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/>我已在管理信箱實際收到測試信，確認可啟用手動交寄。</label>}
   <div className="mailOutboxActions">
    <button disabled={busy||(!queue.manual_enabled&&!confirmed)} onClick={()=>void act({action:'set_manual',enabled:!queue.manual_enabled,receipt_confirmed:confirmed})}>{queue.manual_enabled?'停用手動交寄':'啟用手動交寄'}</button>
    <button disabled={busy||unavailable||!queue.manual_enabled||!(queue.counts.pending>0)} onClick={()=>void act({action:'send_next'})}>{busy?'正在處理通知…':'交寄下一封通知'}</button>
   </div>
   <p>以下顯示最近 50 筆。已交寄代表服務接受，不代表實際送達；結果不明不會自動重試。失敗重試至少間隔一分鐘，每封最多嘗試五次。</p>
   {queue.items.length===0?<p>目前沒有新通知；既有待辦仍請到各審核後台處理。</p>:<ul className="mailOutboxList">{queue.items.map(item=><li key={item.id}>
    <strong>{reviewMailKinds[item.source_kind]?.[0]||'審核待辦'}</strong>
    <span>{states[item.state]||'待確認'} · 已嘗試 {item.attempts} 次</span>
    {item.failure_code&&<span>{failures[item.failure_code]||'請核對處理紀錄'}</span>}
    <time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false})}</time>
    {['failed','unknown'].includes(item.state)&&<button disabled={busy||item.attempts>=5||Date.parse(item.retry_after)>Date.now()} onClick={()=>retry(item)}>{item.state==='unknown'?'核對信箱後排入重試':'排入重試'}</button>}
   </li>)}</ul>}
  </>}
  {notice&&<p role="status">{notice}</p>}
 </section>;
}
