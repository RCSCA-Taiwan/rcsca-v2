import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {signedMailTick} from './admin-mail-signature.mjs';
const env={VERCEL_ENV:'production',RCSCA_MAIL_WORKER_SECRET:'a'.repeat(64)};
const now=1792339200000,nonce='11111111-1111-4111-8111-111111111111';
function headers({time=String(now/1000),id=nonce,mode='run',path='/api/internal/admin-mail/run',key=env.RCSCA_MAIL_WORKER_SECRET}={}){
 return new Headers({'x-rcsca-mail-time':time,'x-rcsca-mail-nonce':id,'x-rcsca-mail-mode':mode,
 'x-rcsca-mail-signature':createHmac('sha256',key).update(`POST\n${path}\n${time}\n${id}\n${mode}`).digest('hex')});
}
test('signed ticks verify each bound field without transmitting the key',()=>{
 const h=headers();assert.deepEqual(signedMailTick(env,h,now),{nonce,seconds:now/1000,verification:false});
 assert.equal(JSON.stringify([...h]).includes(env.RCSCA_MAIL_WORKER_SECRET),false);
 assert.equal(signedMailTick(env,headers({mode:'verify'}),now).verification,true);
 for(const field of ['x-rcsca-mail-time','x-rcsca-mail-nonce','x-rcsca-mail-mode','x-rcsca-mail-signature']){
  const changed=headers();changed.set(field,field==='x-rcsca-mail-mode'?'verify':'invalid');assert.equal(signedMailTick(env,changed,now),null);
 }
 assert.equal(signedMailTick(env,headers({path:'/api/other'}),now),null);
 assert.equal(signedMailTick(env,headers({key:'b'.repeat(64)}),now),null);
});
test('stale, future, malformed, preview and missing-config ticks fail closed',()=>{
 for(const time of [String(now/1000-121),String(now/1000+31),'1e9','1792339200.0'])assert.equal(signedMailTick(env,headers({time}),now),null);
 assert.equal(signedMailTick(env,headers({mode:'unknown'}),now),null);
 assert.equal(signedMailTick(env,headers({id:'../invalid'}),now),null);
 assert.equal(signedMailTick({...env,VERCEL_ENV:'preview'},headers(),now),null);
 assert.equal(signedMailTick({...env,RCSCA_MAIL_WORKER_SECRET:undefined},headers(),now),null);
 assert.equal(signedMailTick(env,new Headers(),now),null);
});
