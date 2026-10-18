import {adminTestMessage,adminMailFailureState} from './admin-mail-config.mjs';
export const reviewMailKinds={
 enterprise_applications:['企業加入','/admin/partners'],enterprise_shares:['企業共享','/admin/partners'],
 network_match_responses:['Network 媒合','/admin/network'],support_cases:['需求個案','/admin/cases'],
 record_change_requests:['公開資料變更','/admin/queue'],reward_redemptions:['共享所核銷','/admin/rewards'],
 activity_participations:['公益參與核實','/admin/verification'],membership_applications:['入會／續會','/admin/members'],
};
export function reviewMailMessage(config,claim){
 if(!claim||typeof claim.id!=='string'||!/^[0-9a-f-]{36}$/i.test(claim.id)||!Object.hasOwn(reviewMailKinds,claim.source_kind))return null;
 const base=adminTestMessage(config,claim);
 if(!base)return null;
 const [label,path]=reviewMailKinds[claim.source_kind];
 return {...base,subject:`${claim.subject_prefix} 新待辦：${label}`,
  messageId:`<review-${claim.id}@rcsca-v2.vercel.app>`,
  text:`RCSCA 官網有新的${label}待處理。\n\n請使用具對應權限的帳號登入後台查看：\nhttps://rcsca-v2.vercel.app${path}\n\n為保護資料，本信不包含姓名、聯絡方式或個案內容。若已處理，請以後台最新狀態為準。`};
}
export function reviewMailFailure(error){
 const code=error&&typeof error==='object'?error.code:undefined;
 const command=error&&typeof error==='object'?error.command:undefined;
 const response=error&&typeof error==='object'?error.responseCode:undefined;
 const safe=adminMailFailureState(error);
 // Only definitive pre-delivery failures are eligible for an ordinary retry.
 if(code==='EAUTH'||code==='EENVELOPE'||(Number.isInteger(response)&&response>=400&&response<=599))
  return {outcome:'failed',failure:safe==='verification_failed'?'rejected':safe};
 if(['ENOTFOUND','ECONNREFUSED','ETLS','ERR_TLS_CERT_ALTNAME_INVALID'].includes(code)||
   (['CONN','AUTH','AUTH PLAIN','AUTH LOGIN','MAIL FROM','RCPT TO'].includes(command)&&safe!=='verification_failed'))
  return {outcome:'failed',failure:safe==='verification_failed'?'connection_failed':safe};
 // A timeout/disconnect after DATA may follow successful acceptance.
 return {outcome:'unknown',failure:'unconfirmed'};
}
export async function deliverReviewClaim(config,claim,transport,record){
 const message=reviewMailMessage(config,claim);
 let outcome='unknown',failure='unconfirmed';
 try{
  if(!message){outcome='failed';failure='rejected';}
  else{
   const result=await transport.sendMail(message);
   if(result.accepted?.some(value=>typeof value==='string'&&value.toLowerCase()===message.to.toLowerCase())){outcome='accepted';failure=null;}
  }
 }catch(error){const result=reviewMailFailure(error);outcome=result.outcome;failure=result.failure;}
 finally{transport.close();}
 try{
  const result=await record(outcome,failure);
  if(result.error)return 'send_unknown';
 }catch{return 'send_unknown';}
 return !message?'recipient_invalid':outcome==='accepted'?'send_accepted':outcome==='failed'?'send_failed':'send_unknown';
}
