'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {getSupabaseBrowserClient} from '../../../lib/supabase-browser';
import {reviewMailKinds} from '../../../lib/admin-mail-outbox.mjs';
import './mail-outbox.css';
type Item={id:string;source_kind:string;state:string;attempts:number;failure_code:string|null;created_at:string;retry_after:string};
type Health='paused'|'not_ready'|'scheduler_stale'|'worker_stale'|'attention'|'healthy';
type Queue={manual_enabled:boolean;automatic_enabled:boolean;automatic_ready:boolean;automatic_health:Health;scheduler_tick_at:string|null;worker_seen_at:string|null;last_accepted_at:string|null;oldest_pending_at:string|null;attention_counts:{unknown:number;terminal_failed:number};last_run:{state:string;claimed:number;started_at:string;finished_at:string|null}|null;items:Item[];counts:Record<string,number>};
const states:Record<string,string>={pending:'待交寄',sending:'交寄中',accepted:'服務已接受交寄',failed:'交寄失敗',unknown:'結果不明，須核對信箱',cancelled:'已取消通知'};
const failures:Record<string,string>={authentication_failed:'帳密驗證被拒絕',connection_failed:'連線失敗',connection_timeout:'連線逾時',tls_failed:'加密連線失敗',rejected:'服務拒絕交寄',unconfirmed:'尚未確認是否交寄成功'};
const messages:Record<string,string>={updated:'手動交寄設定已更新。',retry_queued:'已排回待交寄，仍需主動按「交寄下一封通知」。',retry_unavailable:'目前不能重試，可能尚在冷卻、已達上限或待辦狀態已變更，請重新讀取。',send_accepted:'寄信服務已接受交寄；實際收到仍需到信箱確認。',send_failed:'本次交寄失敗，已保留紀錄，請先檢查寄信設定。',send_unknown:'結果不明，請先核對信箱；這封信不會自動重寄。',nothing_due:'目前沒有可交寄的通知，請以最新佇列為準。',claim_unavailable:'尚未啟用手動交寄，或目前無法取得待寄通知。',not_configured:'寄信設定尚未完成。',invalid_gmail_password:'寄信憑證格式不符，請核對設定。',action_rejected:'未完成收信確認或設定變更被拒絕。',unavailable:'無法讀取通知佇列，請重新讀取。'};
const healthMessages:Record<Health,string>={
 paused:'自動寄送目前已暫停。',
 not_ready:'自動寄送設定尚未完整就緒，請檢查排程與 worker 設定。',
 scheduler_stale:'自動排程超過 15 分鐘沒有更新，請檢查 Supabase pg_cron／pg_net。',
 worker_stale:'排程仍在運作，但寄信 worker 超過 15 分鐘沒有回報，請檢查正式站 worker 與 Vercel 執行狀態。',
 attention:'自動寄送仍在運作，但有結果不明或已達重試上限的通知，需要人工核對。',
 healthy:'自動寄送排程與 worker 目前正常。',
};
function tw(value:string){return new Date(value).toLocaleString('zh-TW',{timeZone:'Asia/Taipei',hour12:false});}
export default function MailOutbox(){
 const [queue,setQueue]=useState<Queue|null>(null),[unavailable,setUnavailable]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[confirmed,setConfirmed]=useState(false);
 const lock=useRef(false),alive=useRef(true),readSequence=useRef(0);
 const request=useCallback(async(body?:Record<string,unknown>)=>{
  const {data:{session}}=await getSupabaseBrowserClient().auth.getSession();
  if(!session)throw new Error('unavailable');
  return fetch('/api/admin/mail/outbox',{method:body?'POST':'GET',headers:{Authorization:`Bearer ${session.access_token}`,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),cache:'no-store'});
 },[]);
 const load=useCallback(async()=>{
  const sequence=++readSequence.current;
  try{
  const response=await request();
  if(!alive.current||sequence!==readSequence.current)return;
  if(response.status===401||response.status===403){setQueue(null);setUnavailable(false);return;}
  const data=await response.json();
  if(!alive.current||sequence!==readSequence.current)return;
  if(!response.ok||!Array.isArray(data.items))throw new Error('unavailable');
  setQueue(data);setUnavailable(false);
  }catch(error){if(alive.current&&sequence===readSequence.current)throw error;}
 },[request]);
 useEffect(()=>{alive.current=true;void load().catch(()=>{if(alive.current)setUnavailable(true);});return()=>{alive.current=false;readSequence.current++;};},[load]);
 async function act(body?:Record<string,unknown>){
  if(lock.current)return;lock.current=true;setBusy(true);setNotice('');
  try{
   if(body){const response=await request(body);const result=await response.json();if(alive.current)setNotice(result.state==='updated'?'寄送設定已更新。':result.state==='retry_queued'?'已排回待交寄，依目前啟用的寄送模式處理。':messages[result.state]||'操作結果尚未確認，請先重新讀取並核對信箱。');}
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
  <p><strong>{queue?.automatic_enabled?'自動寄送已啟用。':'自動寄送尚未啟用。'}</strong>自動模式每五分鐘檢查一次，每次最多交寄三封。暫停後不再領取下一封，已開始的交寄仍可能完成。</p>
  {unavailable&&<p role="alert">通知清單尚未確認完整，請重新讀取。</p>}
  <button disabled={busy} onClick={()=>void act()}>重新讀取通知佇列</button>
  {queue&&<>
   <p role={['not_ready','scheduler_stale','worker_stale','attention'].includes(queue.automatic_health)?'alert':undefined}><strong>自動寄送健康狀態：</strong>{healthMessages[queue.automatic_health]||'目前狀態無法判定，請重新讀取。'}</p>
   {!queue.automatic_ready&&!queue.automatic_enabled&&<p>自動排程尚未完成連線驗證，目前不能啟用；手動交寄仍可使用。</p>}
   <label className="mailReceiptConfirm"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/>我已在管理信箱實際收到測試信，確認可啟用寄送。</label>
   <button disabled={busy||(!queue.automatic_enabled&&(!queue.automatic_ready||!confirmed))} onClick={()=>void act({action:'set_automatic',enabled:!queue.automatic_enabled,receipt_confirmed:confirmed})}>{queue.automatic_enabled?'暫停自動寄送':'啟用自動寄送'}</button>
   {queue.scheduler_tick_at&&<p>最近排程檢查：{tw(queue.scheduler_tick_at)}</p>}
   {queue.worker_seen_at&&<p>最近工作器連線：{tw(queue.worker_seen_at)}</p>}
   {queue.last_accepted_at&&<p>最近 SMTP 接受交寄：{tw(queue.last_accepted_at)}（接受交寄不等於收件匣送達）</p>}
   {queue.oldest_pending_at&&<p>目前最早待交寄：{tw(queue.oldest_pending_at)}</p>}
   {queue.last_run&&<p>最近執行：{({running:'執行中',completed:'已完成本輪',unknown:'結果不明，請核對紀錄',configuration_failed:'寄信設定不符'})[queue.last_run.state]||'待確認'} · 領取 {queue.last_run.claimed} 封</p>}
   <p>待交寄 {queue.counts.pending||0} · 交寄中 {queue.counts.sending||0} · 已交寄 {queue.counts.accepted||0} · 失敗 {queue.counts.failed||0} · 結果不明 {queue.counts.unknown||0}</p>
   {(queue.attention_counts.unknown>0||queue.attention_counts.terminal_failed>0)&&<p role="alert">需人工處理：結果不明 {queue.attention_counts.unknown} 封 · 已達五次重試上限 {queue.attention_counts.terminal_failed} 封。</p>}
   <div className="mailOutboxActions">
    <button disabled={busy||(!queue.manual_enabled&&!confirmed)} onClick={()=>void act({action:'set_manual',enabled:!queue.manual_enabled,receipt_confirmed:confirmed})}>{queue.manual_enabled?'停用手動交寄':'啟用手動交寄'}</button>
    <button disabled={busy||unavailable||!queue.manual_enabled||!(queue.counts.pending>0)} onClick={()=>void act({action:'send_next'})}>{busy?'正在處理通知…':'交寄下一封通知'}</button>
   </div>
   <p>以下顯示最近 50 筆。已交寄代表服務接受，不代表實際送達；結果不明不會自動重試。自動模式僅重試已確認失敗的交寄，依次等待至少 1、5、15、60 分鐘，每封最多嘗試五次。手動模式需主動排入重試。冷卻結束後請重新讀取佇列。</p>
   {queue.items.length===0?<p>目前沒有新通知；既有待辦仍請到各審核後台處理。</p>:<ul className="mailOutboxList">{queue.items.map(item=><li key={item.id}>
    <strong>{reviewMailKinds[item.source_kind]?.[0]||'審核待辦'}</strong>
    <span>{states[item.state]||'待確認'} · 已嘗試 {item.attempts} 次</span>
    {item.failure_code&&<span>{failures[item.failure_code]||'請核對處理紀錄'}</span>}
    <time dateTime={item.created_at}>{tw(item.created_at)}</time>
    {['failed','unknown'].includes(item.state)&&<button disabled={busy||item.attempts>=5||Date.parse(item.retry_after)>Date.now()} onClick={()=>retry(item)}>{item.state==='unknown'?'核對信箱後排入重試':'排入重試'}</button>}
   </li>)}</ul>}
  </>}
  {notice&&<p role="status">{notice}</p>}
 </section>;
}