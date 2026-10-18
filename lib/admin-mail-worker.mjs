import {timingSafeEqual} from 'node:crypto';
import {adminMailConfig} from './admin-mail-config.mjs';
import {deliverReviewClaim} from './admin-mail-outbox.mjs';

export function workerAuthorized(env,header){
 const secret=env.RCSCA_MAIL_WORKER_SECRET;
 if(env.VERCEL_ENV!=='production'||!secret||!/^[a-f0-9]{64}$/.test(secret)||typeof header!=='string')return false;
 const expected=Buffer.from(`Bearer ${secret}`),actual=Buffer.from(header);
 return expected.length===actual.length&&timingSafeEqual(expected,actual);
}

// Bounded work only. The database owns locks, pause checks, retry delays and
// attempt limits. No in-process timers, self-invocations or memory-only leases.
export async function runMailWorker(env,rpc,makeTransport){
 let run;
 async function call(action,extra={}){
  const result=await rpc({p_token:env.RCSCA_MAIL_WORKER_SECRET,p_action:action,...(run?{p_run:run}:{}),...extra});
  if(result.error)throw new Error('worker_database_unavailable');
  return result.data;
 }
 const start=await call('begin');
 if(start.state!=='running')return {state:start.state,processed:0};
 run=start.id;
 const config=adminMailConfig(env);
 if(config.state!=='configured'){
  await call('close',{p_outcome:'configuration_failed'});
  return {state:'configuration_failed',processed:0};
 }
 let processed=0;
 try{
  for(let index=0;index<3;index++){
   const claim=await call('claim');
   if(!claim)break;
   const state=await deliverReviewClaim(config,claim,makeTransport(config),async(outcome,failure)=>{
    await call('finish',{p_id:claim.id,p_lease:claim.lease_id,p_outcome:outcome,p_failure:failure});
    return {error:null};
   });
   processed++;
   if(state==='send_unknown'){
    await call('close',{p_outcome:'unknown'});
    return {state:'unknown',processed};
   }
   // Credential/connection failures should not consume more queue entries in
   // the same run. A later scheduled run can try after durable DB backoff.
   if(state!=='send_accepted')break;
  }
  await call('close',{p_outcome:'completed'});
  return {state:'completed',processed};
 }catch{
  try{await call('close',{p_outcome:'unknown'});}catch{/* Lease expiry remains fail-closed. */}
  return {state:'unknown',processed};
 }
}
