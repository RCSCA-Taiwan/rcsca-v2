import {NextResponse,type NextRequest} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import {adminMailConfig} from '../../../../../lib/admin-mail-config.mjs';
import {deliverReviewClaim} from '../../../../../lib/admin-mail-outbox.mjs';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;
const reply=(state:string,status=200)=>NextResponse.json({state,delivery_verified:false},{status,headers:{'Cache-Control':'private, no-store'}});
async function access(request:NextRequest){
 const header=request.headers.get('authorization')||'';
 if(!header.startsWith('Bearer ')||header.length>8192)return {status:401} as const;
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return {status:503} as const;
 const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:header}}});
 const {data,error}=await client.auth.getUser(header.slice(7));
 if(error||!data.user)return {status:401} as const;
 const routing=await client.rpc('admin_site_mail_routing');
 if(routing.error)return {status:403} as const;
 return {status:200,client} as const;
}
export async function GET(request:NextRequest){
 try{
  const auth=await access(request);if(!auth.client)return reply('unavailable',auth.status);
  const result=await auth.client.rpc('admin_mail_queue');
  if(result.error)return reply('queue_unavailable',503);
  return NextResponse.json(result.data,{headers:{'Cache-Control':'private, no-store'}});
 }catch{return reply('queue_unavailable',503);}
}
export async function POST(request:NextRequest){
 try{
  const origin=new URL(request.headers.get('origin')||'');
  if(origin.origin!==request.headers.get('origin')||origin.host!==request.headers.get('host')?.toLowerCase()||origin.protocol!==request.nextUrl.protocol)return reply('unavailable',403);
 }catch{return reply('unavailable',403);}
 try{
  const auth=await access(request);if(!auth.client)return reply('unavailable',auth.status);
  if(Number(request.headers.get('content-length')||0)>1024)return reply('invalid_action',400);
  const body=await request.json();
  if(body.action==='set_manual'){
   if(typeof body.enabled!=='boolean')return reply('invalid_action',400);
   const r=await auth.client.rpc('admin_mail_set_manual',{p_enabled:body.enabled,p_receipt_confirmed:body.receipt_confirmed===true});
   return reply(r.error?'action_rejected':'updated',r.error?409:200);
  }
  if(body.action==='retry'){
   if(typeof body.id!=='string'||!/^[0-9a-f-]{36}$/i.test(body.id))return reply('invalid_action',400);
   const r=await auth.client.rpc('admin_mail_retry',{p_id:body.id,p_duplicate_checked:body.duplicate_checked===true});
   return reply(r.error?'retry_unavailable':'retry_queued',r.error?409:200);
  }
  if(body.action!=='send_next')return reply('invalid_action',400);
  const config=adminMailConfig(process.env);
  if(config.state!=='configured')return reply(config.state,503);
  const claimed=await auth.client.rpc('admin_mail_claim');
  if(claimed.error)return reply('claim_unavailable',409);
  if(!claimed.data)return reply('nothing_due');
  const claim=claimed.data;
  const finish=async(outcome:string,failure:string|null)=>auth.client.rpc('admin_mail_finish',{p_id:claim.id,p_lease:claim.lease_id,p_outcome:outcome,p_failure:failure});
  const transport=nodemailer.createTransport({host:config.host,port:config.port,secure:config.port===465,requireTLS:config.port===587,
   auth:{user:config.user,pass:config.pass},tls:{minVersion:'TLSv1.2',rejectUnauthorized:true},
   connectionTimeout:7000,greetingTimeout:7000,socketTimeout:7000,logger:false,debug:false,disableFileAccess:true,disableUrlAccess:true});
  const state=await deliverReviewClaim(config,claim,transport,finish);
  return reply(state,state==='send_unknown'?502:200);
 }catch{return reply('action_unknown',502);}
}
