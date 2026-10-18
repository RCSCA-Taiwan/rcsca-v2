import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewMailMessage,reviewMailFailure,reviewMailKinds,deliverReviewClaim} from './admin-mail-outbox.mjs';
test('review messages use only fixed kinds, private recipient and safe official links',()=>{
 const config={from:'sender@example.invalid',pass:'private-synthetic-secret'};
 const claim={id:'10c95f11-60c1-4e1a-bfd9-121a80043114',recipient_email:'admin@example.invalid',subject_prefix:'【RCSCA官網】',source_kind:'enterprise_applications',name:'PRIVATE NAME',text:'UNTRUSTED',url:'https://untrusted.invalid'};
 for(const kind of Object.keys(reviewMailKinds)){
  const message=reviewMailMessage(config,{...claim,source_kind:kind});
  assert.equal(message.to,claim.recipient_email);
  assert.match(message.text,/https:\/\/rcsca-v2\.vercel\.app\/admin\//);
  assert.ok(!JSON.stringify(message).includes('PRIVATE NAME'));
  assert.ok(!JSON.stringify(message).includes('UNTRUSTED'));
  assert.ok(!JSON.stringify(message).includes(config.pass));
  assert.equal(message.messageId,reviewMailMessage(config,{...claim,source_kind:kind}).messageId);
 }
 for(const invalid of [null,{...claim,source_kind:'toString'},{...claim,id:'bad\r\nBcc:a@b.test'},{...claim,recipient_email:'a@b.test,c@d.test'}])assert.equal(reviewMailMessage(config,invalid),null);
});
test('worker sends exactly its claimed fixed message, closes transport and records acceptance once',async()=>{
 const config={from:'sender@example.invalid'},claim={id:'10c95f11-60c1-4e1a-bfd9-121a80043114',recipient_email:'admin@example.invalid',subject_prefix:'TEST',source_kind:'enterprise_applications'};
 let sends=0,closed=0;const recorded=[];
 const state=await deliverReviewClaim(config,claim,{async sendMail(message){sends++;assert.equal(message.to,claim.recipient_email);return {accepted:[claim.recipient_email]};},close(){closed++;}},async(...args)=>{recorded.push(args);return {error:null};});
 assert.equal(state,'send_accepted');assert.equal(sends,1);assert.equal(closed,1);assert.deepEqual(recorded,[['accepted',null]]);
});
test('worker distinguishes DATA uncertainty, auth rejection and accepted-but-unrecorded result without sending twice',async()=>{
 const config={from:'sender@example.invalid'},claim={id:'10c95f11-60c1-4e1a-bfd9-121a80043114',recipient_email:'admin@example.invalid',subject_prefix:'TEST',source_kind:'enterprise_applications'};
 for(const [error,recordError,expected,outcome] of [[{code:'ETIMEDOUT',command:'DATA'},null,'send_unknown','unknown'],[{code:'EAUTH'},null,'send_failed','failed'],[null,'synthetic recording failure','send_unknown','accepted']]){
  let sends=0,closed=0,recordCount=0;
  const actual=await deliverReviewClaim(config,claim,{async sendMail(){sends++;if(error)throw error;return {accepted:[claim.recipient_email]};},close(){closed++;}},async(state)=>{recordCount++;assert.equal(state,outcome);return {error:recordError};});
  assert.equal(actual,expected);assert.equal(sends,1);assert.equal(closed,1);assert.equal(recordCount,1);
 }
 let sends=0;
 assert.equal(await deliverReviewClaim(config,{...claim,recipient_email:'bad'}, {async sendMail(){sends++;return {};},close(){}},async()=>({error:null})),'recipient_invalid');
 assert.equal(sends,0);
});
test('uncertain delivery never becomes an ordinary automatic retry',()=>{
 assert.deepEqual(reviewMailFailure({code:'EAUTH',message:'SECRET'}),{outcome:'failed',failure:'authentication_failed'});
 assert.deepEqual(reviewMailFailure({code:'ETIMEDOUT',command:'CONN'}),{outcome:'failed',failure:'connection_timeout'});
 assert.deepEqual(reviewMailFailure({responseCode:550,command:'DATA'}),{outcome:'failed',failure:'rejected'});
 for(const error of [{code:'ETIMEDOUT',command:'DATA'},{code:'ESOCKET',command:'DATA'},{code:'ETIMEDOUT'},new Error('SECRET')])assert.deepEqual(reviewMailFailure(error),{outcome:'unknown',failure:'unconfirmed'});
});
