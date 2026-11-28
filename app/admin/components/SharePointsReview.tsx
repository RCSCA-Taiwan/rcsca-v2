'use client';
import {useMemo,useState} from 'react';

type Props={
  referenceValueTwd:number;
  pointsPerTwd:number|null;
  roundingIncrement:number;
  onDecision?:(decision:{suggestedPoints:number|null;approvedPoints:number;adjustmentReason:string})=>void;
};
/** Review widget only: no database write or publishing side effect.
 * Parent admin workflow must verify reviewer permissions and persist audit trail server-side.
 */
export default function SharePointsReview({referenceValueTwd,pointsPerTwd,roundingIncrement,onDecision}:Props){
 const suggested=useMemo(()=>{
  if(!Number.isSafeInteger(referenceValueTwd)||referenceValueTwd<=0||
    pointsPerTwd===null||!Number.isSafeInteger(pointsPerTwd)||pointsPerTwd<=0||
    !Number.isSafeInteger(roundingIncrement)||roundingIncrement<=0)return null;
  const raw=referenceValueTwd*pointsPerTwd;
  const points=Math.ceil(raw/roundingIncrement)*roundingIncrement;
  return Number.isSafeInteger(points)?points:null;
 },[referenceValueTwd,pointsPerTwd,roundingIncrement]);
 const [override,setOverride]=useState('');
 const [reason,setReason]=useState('');
 const approved=override.trim()?Number(override):suggested;
 const valid=approved!==null&&Number.isSafeInteger(approved)&&approved>0;
 const modified=valid&&suggested!==null&&approved!==suggested;
 const canConfirm=valid&&(!modified||reason.trim().length>0);
 return <section aria-label="共享商品點數審核">
  <h3>共享商品／服務點數審核</h3>
  <p>企業申報參考價值：NT$ {Number.isFinite(referenceValueTwd)?referenceValueTwd.toLocaleString('zh-TW'):'—'}</p>
  <p>換算規則：{pointsPerTwd===null?'尚未核定':`每 NT$1 對應 ${pointsPerTwd} 點；進位單位 ${roundingIncrement} 點`}</p>
  <p>系統建議點數：<strong>{suggested===null?'待核定換算規則':suggested.toLocaleString('zh-TW')+' 點'}</strong></p>
  <label>協會核定點數（可調整）
   <input type="number" min="1" step="1" value={override} placeholder={suggested===null?'請輸入核定點數':String(suggested)} onChange={e=>setOverride(e.target.value)}/>
  </label>
  <label>調整原因（變更建議點數時必填）
   <textarea value={reason} onChange={e=>setReason(e.target.value)} maxLength={1000}/>
  </label>
  {modified&&!reason.trim()&&<p role="alert">核定點數與建議值不同，請填寫調整原因。</p>}
  <button type="button" disabled={!canConfirm||!onDecision} onClick={()=>{if(canConfirm&&approved!==null)onDecision?.({suggestedPoints:suggested,approvedPoints:approved,adjustmentReason:reason.trim()})}}>確認點數審核資料</button>
  <small>此畫面不會直接開放兌換；需另經驗收入庫或服務名額確認。</small>
 </section>;
}
