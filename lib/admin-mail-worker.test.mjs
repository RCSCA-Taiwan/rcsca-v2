import test from 'node:test';
import assert from 'node:assert/strict';
import {workerAuthorized,runMailWorker} from './admin-mail-worker.mjs';
const env={VERCEL_ENV:'production',RCSCA_MAIL_WORKER_SECRET:'a'.repeat(64),RCSCA_SMTP_USER:'sender@example.invalid',RCSCA_SMTP_PASSWORD:'synthetic-only',RCSCA_SMTP_HOST:'smtp.example.invalid'};
const claim={id:'11111111-1111-4111-8111-111111111111',lease_id:'22222222-2222-4222-8222-222222222222',source_kind:'support_cases',recipient_email:'recipient@example.invalid',subject_prefix:'[Test]'};
function fixture({start='running',error,finishError=false,limit=10}={}){
 const calls=[];let sends=0,closed=0,claims=0;
 const rpc=async args=>{
  calls.push(args);
  if(args.p_action==='begin')return {data:{state:start,id:'run'},error:null};
  if(args.p_action==='claim')return {data:claims++<limit?claim:null,error:null};
  return {data:{},error:finishError&&args.p_action==='finish'?'synthetic':null};
 };
 const transport=()=>({sendMail:async()=>{sends++;if(error)throw error;return {accepted:[claim.recipient_email]};},close(){closed++;}});
 return {calls,rpc,transport,stats:()=>({sends,closed})};
}
test('worker authorization is production-only, constant-length and fail-closed',()=>{
 assert.equal(workerAuthorized(env,`Bearer ${env.RCSCA_MAIL_WORKER_SECRET}`),true);
 for(const header of [null,'',`Bearer ${'b'.repeat(64)}`,`Bearer ${'a'.repeat(63)}`])assert.equal(workerAuthorized(env,header),false);
 assert.equal(workerAuthorized({...env,VERCEL_ENV:'preview'},`Bearer ${env.RCSCA_MAIL_WORKER_SECRET}`),false);
 assert.equal(workerAuthorized({...env,RCSCA_MAIL_WORKER_SECRET:undefined},'Bearer undefined'),false);
});
test('paused/busy worker never creates transport or claims mail',async()=>{
 for(const start of ['paused','busy']){const f=fixture({start});assert.deepEqual(await runMailWorker(env,f.rpc,f.transport),{state:start,processed:0});assert.equal(f.calls.length,1);assert.equal(f.stats().sends,0);}
});
test('missing SMTP config is recorded before any claim',async()=>{
 const f=fixture();assert.deepEqual(await runMailWorker({...env,RCSCA_SMTP_PASSWORD:''},f.rpc,f.transport),{state:'configuration_failed',processed:0});
 assert.deepEqual(f.calls.map(c=>c.p_action),['begin','close']);assert.equal(f.stats().sends,0);
});
test('worker caps each run at three and records every result',async()=>{
 const f=fixture();assert.deepEqual(await runMailWorker(env,f.rpc,f.transport),{state:'completed',processed:3});
 assert.deepEqual(f.stats(),{sends:3,closed:3});assert.equal(f.calls.filter(c=>c.p_action==='finish'&&c.p_outcome==='accepted').length,3);
});
test('database pause/no more due mail stops the next claim',async()=>{
 const f=fixture({limit:1});assert.equal((await runMailWorker(env,f.rpc,f.transport)).processed,1);assert.equal(f.stats().sends,1);
});
test('definitive failure is recorded once and ends the batch',async()=>{
 const f=fixture({error:{code:'EAUTH'}});await runMailWorker(env,f.rpc,f.transport);
 assert.equal(f.stats().sends,1);assert.equal(f.calls.find(c=>c.p_action==='finish').p_outcome,'failed');
});
test('post-DATA uncertainty stops batch without retry',async()=>{
 const f=fixture({error:{code:'ETIMEDOUT',command:'DATA'}});assert.equal((await runMailWorker(env,f.rpc,f.transport)).state,'unknown');
 assert.equal(f.stats().sends,1);assert.equal(f.calls.find(c=>c.p_action==='finish').p_outcome,'unknown');
});
test('lost database acknowledgement never resends accepted mail',async()=>{
 const f=fixture({finishError:true});assert.equal((await runMailWorker(env,f.rpc,f.transport)).state,'unknown');assert.equal(f.stats().sends,1);
});
