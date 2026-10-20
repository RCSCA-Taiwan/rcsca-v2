'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {useOwnedRecords,verifiedRecordsClient} from './components/useOwnedRecords';
import Link from 'next/link';
import {getFulfillmentClient} from '../lib/reward-fulfillment-api';
import {fulfillmentError,fulfillmentLabels,shippingLabels,slotTime,type FulfillmentOrder,type RewardSlot} from '../lib/reward-fulfillment';
import './fulfillment.css';
const validOrder=(r:FulfillmentOrder)=>!!r&&typeof r.id==='string'&&typeof r.reward_id==='string'&&typeof r.title==='string'&&['service','delivery'].includes(r.fulfillment_type)&&typeof r.effective_state==='string'&&typeof r.redemption_status==='string'&&typeof r.point_cost==='number'&&Number.isFinite(r.point_cost)&&(['contact_name','phone','shipping_policy'] as const).every(key=>typeof r[key]==='string')&&(['starts_at','ends_at','hold_until','address','postal_code','shipping_note','carrier','tracking_number','provider_note','issue_note','issue_resolution'] as const).every(key=>r[key]===null||typeof r[key]==='string');
export default function FulfillmentOrders({manage=false}:{manage?:boolean}){
 const[busy,setBusy]=useState(''),[notice,setNotice]=useState(''),[actionError,setActionError]=useState('');
 const read=useCallback((s:ReturnType<typeof getFulfillmentClient>)=>s.rpc('reward_fulfillment_list',{p_manage:manage}),[manage]);
 const {rows,loading,failed,userId,load}=useOwnedRecords<FulfillmentOrder>(read,validOrder);
 const[notes,setNotes]=useState<Record<string,string>>({}),[carriers,setCarriers]=useState<Record<string,string>>({}),[tracking,setTracking]=useState<Record<string,string>>({}),[slots,setSlots]=useState<Record<string,RewardSlot[]>>({}),[selectedSlot,setSelectedSlot]=useState<Record<string,string>>({});
 const lock=useRef(false);
 useEffect(()=>{const refresh=()=>void load();window.addEventListener('reward-cancellation-updated',refresh);return()=>window.removeEventListener('reward-cancellation-updated',refresh);},[load]);
 useEffect(()=>{if(busy)return;const timer=setTimeout(()=>void load(),60000);return()=>clearTimeout(timer);},[rows,load,busy]);
 async function act(r:FulfillmentOrder,action:string){if(lock.current||busy||loading||failed||!userId||!rows?.some(x=>x.id===r.id)||r.cancellation_pending)return;if(['received','confirm','accept_time'].includes(action)&&!window.confirm(action==='received'?'確認你已實際收到商品或服務？':action==='accept_time'?'接受此替代時段並以目前點數完成兌換？':'確認接受本次預約或配送申請並扣除點數？'))return;lock.current=true;setBusy(r.id);setNotice('');setActionError('');try{const s=await verifiedRecordsClient(userId);const result=await s.rpc('reward_fulfillment_action',{p_redemption:r.id,p_action:action,p_note:notes[r.id]||'',p_slot:selectedSlot[r.id]||null,p_carrier:carriers[r.id]||'',p_tracking:tracking[r.id]||''});if(result.error)throw result.error;setNotice('進度已更新。');if(['report_issue','resolve_issue','reject'].includes(action))setNotes(x=>({...x,[r.id]:''}));if(action==='ship'){setCarriers(x=>({...x,[r.id]:''}));setTracking(x=>({...x,[r.id]:''}));}await load();}catch(e){setActionError(fulfillmentError(e));}finally{lock.current=false;setBusy('');}}
 async function findSlots(r:FulfillmentOrder){
  if(lock.current||busy||loading||failed||!userId||!manage)return;
  lock.current=true;setBusy(r.id);setActionError('');
  try{const s=await verifiedRecordsClient(userId);const x=await s.rpc('reward_available_slots',{p_reward:r.reward_id});
   if(x.error||!Array.isArray(x.data)||!x.data.every(v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&typeof v.id==='string'&&typeof v.starts_at==='string'&&typeof v.remaining==='number'))throw new Error('unconfirmed_slots');
   setSlots(v=>({...v,[r.id]:x.data as unknown as RewardSlot[]}));
  }catch{setActionError('無法讀取替代時段，請重試。');}finally{lock.current=false;setBusy('');}
 }
 return <section className="fulfillmentOrders" aria-label={manage?'預約與配送履約工作台':'我的預約與配送'} aria-busy={loading||!!busy}><h2>{manage?'預約與配送履約工作台':'我的預約與配送'}</h2>{notice&&<p role="status" className="workflowNotice">{notice}</p>}
 {manage&&<p>只顯示你負責的訂單；授權會員管理員可處理全部訂單。聯絡資料限本次履約使用。</p>}
 <button className="recordsRetry" disabled={loading||!!busy} onClick={()=>void load()}>重新讀取預約與配送</button>
 {actionError&&<p role="alert" className="workflowNotice">{actionError}</p>}
 {loading?<p role="status">正在讀取預約與配送…</p>:failed?<div className="privacyCallout" role="alert">目前無法讀取預約與配送資料，請重新讀取。</div>:!userId?<p>請先登入具操作權限的帳號。</p>:rows?.length?rows.map(r=><article className="membershipCard" key={r.id}><div className="membershipCardHead"><h3>{r.title}</h3><strong>{fulfillmentLabels[r.effective_state]||r.effective_state}</strong></div><p>{r.point_cost} 共享點 · {r.fulfillment_type==='service'?'服務預約':'商品配送'}</p>
 {r.starts_at&&<p>時段：{slotTime(r.starts_at)} ～ {r.ends_at&&slotTime(r.ends_at)}（台灣時間）</p>}
 {r.hold_until&&r.redemption_status==='submitted'&&<p>暫時保留至：{slotTime(r.hold_until)}（若積分先到期，則提前釋出）</p>}
 <p>聯絡／收件人：{r.contact_name} · {r.phone}</p>{r.address&&<p>{r.postal_code} {r.address}</p>}{r.fulfillment_type==='delivery'&&<p>{shippingLabels[r.shipping_policy]}：{r.shipping_note}</p>}{r.tracking_number&&<p>物流：{r.carrier} · 單號 {r.tracking_number}</p>}{r.provider_note&&<p>夥伴說明：{r.provider_note}</p>}{r.issue_note&&<p>問題回報：{r.issue_note}</p>}{r.issue_resolution&&<p>處理回覆：{r.issue_resolution}</p>}
 {r.cancellation_pending?<p role="status">取消申請審核中，暫停核銷、出貨與服務完成操作。</p>:<fieldset className="fulfillmentActions" disabled={!!busy}>
 {!manage&&r.redemption_status==='submitted'&&<button disabled={!!busy} onClick={()=>void act(r,'cancel')}>撤回申請</button>}
 {!manage&&r.effective_state==='time_proposed'&&<button disabled={!!busy} onClick={()=>void act(r,'accept_time')}>接受替代時段並兌換</button>}
 {!manage&&['shipped','service_delivered'].includes(r.effective_state)&&<button disabled={!!busy} onClick={()=>void act(r,'received')}>確認已收到商品／服務</button>}
 {manage&&r.effective_state==='pending'&&<button disabled={!!busy} onClick={()=>void act(r,'confirm')}>確認並扣點</button>}
 {manage&&r.redemption_status==='submitted'&&<><label>處理說明<textarea aria-label="處理說明" maxLength={1000} value={notes[r.id]||''} onChange={e=>setNotes(x=>({...x,[r.id]:e.target.value}))}/></label><button disabled={!!busy||!notes[r.id]?.trim()} onClick={()=>void act(r,'reject')}>不接受並釋出</button>{r.fulfillment_type==='service'&&r.effective_state!=='expired'&&<><button disabled={!!busy} onClick={()=>void findSlots(r)}>提出替代時段</button>{slots[r.id]&&<><select aria-label="替代時段" value={selectedSlot[r.id]||''} onChange={e=>setSelectedSlot(x=>({...x,[r.id]:e.target.value}))}><option value="">請選擇</option>{slots[r.id].map(s=><option key={s.id} value={s.id} disabled={s.remaining<=0&&s.id!==r.slot_id}>{slotTime(s.starts_at)} · 剩餘 {s.remaining}</option>)}</select><button disabled={!!busy||!selectedSlot[r.id]} onClick={()=>void act(r,'propose_time')}>送出替代時段</button></>}</>}</>}
 {manage&&r.effective_state==='awaiting_dispatch'&&<><label>物流名稱<input aria-label="物流名稱" maxLength={100} value={carriers[r.id]||''} onChange={e=>setCarriers(x=>({...x,[r.id]:e.target.value}))}/></label><label>物流單號<input aria-label="物流單號" maxLength={100} value={tracking[r.id]||''} onChange={e=>setTracking(x=>({...x,[r.id]:e.target.value}))}/></label><button disabled={!!busy||!carriers[r.id]?.trim()||!tracking[r.id]?.trim()} onClick={()=>void act(r,'ship')}>記錄已出貨</button></>}
 {manage&&r.effective_state==='confirmed'&&<button disabled={!!busy} onClick={()=>void act(r,'service_delivered')}>記錄服務已提供</button>}
 {!manage&&['approved','completed'].includes(r.redemption_status)&&<><label>問題說明<textarea aria-label="問題說明" maxLength={1000} value={notes[r.id]||''} onChange={e=>setNotes(x=>({...x,[r.id]:e.target.value}))}/></label><button disabled={!!busy||!notes[r.id]?.trim()} onClick={()=>void act(r,'report_issue')}>回報履約問題</button></>}
 {manage&&r.issue_note&&!r.issue_resolution&&<><label>問題處理結果（限管理員）<textarea aria-label="問題處理結果（限管理員）" maxLength={1000} value={notes[r.id]||''} onChange={e=>setNotes(x=>({...x,[r.id]:e.target.value}))}/></label><button disabled={!!busy||!notes[r.id]?.trim()} onClick={()=>void act(r,'resolve_issue')}>記錄問題處理結果</button></>}
 </fieldset>}</article>):<p>目前沒有預約或配送紀錄。</p>}
 <p><Link href="/account/redemptions">我的全部兌換 →</Link>　<Link href="/share-market">共享所 →</Link></p></section>;
}
