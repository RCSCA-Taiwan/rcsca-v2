import {NextResponse,type NextRequest} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import {adminMailConfig,adminMailFailureState,adminTestMessage} from '../../../../lib/admin-mail-config.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;
function reply(body:Record<string,unknown>,status=200){
  return NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
}
async function authorize(request:NextRequest){
  const header=request.headers.get('authorization')||'';
  if(!header.startsWith('Bearer ')||header.length>8192)return {status:401};
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return {status:503};
  const token=header.slice(7);
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:header}}});
  const {data,error}=await client.auth.getUser(token);
  if(error||!data.user)return {status:401};
  // This RPC checks the authoritative admin role in the database.
  const routing=await client.rpc('admin_site_mail_routing');
  return routing.error?{status:403}:{status:200,routing:routing.data};
}
async function handle(request:NextRequest,action:'read'|'verify'|'send_test'){
  try{
    const access=await authorize(request);
    if(access.status!==200)return reply({state:'unavailable'},access.status);
    const config=adminMailConfig(process.env);
    if(config.state!=='configured')return reply({state:config.state},action==='read'?200:503);
    if(action==='read')return reply({state:'configured'});
    // Recipient and content come only from private settings and fixed code.
    // Browser-supplied bodies are never used as message fields.
    const message=action==='send_test'?adminTestMessage(config,access.routing):null;
    if(action==='send_test'&&!message)return reply({state:'test_recipient_invalid'},503);
    const transport=nodemailer.createTransport({
      host:config.host,port:config.port,secure:config.port===465,requireTLS:config.port===587,
      auth:{user:config.user,pass:config.pass},
      tls:{minVersion:'TLSv1.2',rejectUnauthorized:true},
      connectionTimeout:10000,greetingTimeout:10000,socketTimeout:10000,
      logger:false,debug:false,disableFileAccess:true,disableUrlAccess:true,
    });
    try{
      if(message){
        const info=await transport.sendMail(message);
        const accepted=info.accepted?.some(entry=>typeof entry==='string'&&entry.toLowerCase()===message.to.toLowerCase());
        return reply({state:accepted?'test_accepted':'test_failed',delivery_verified:false},accepted?200:502);
      }
      // SMTP verification authenticates without sending any message.
      await transport.verify();
      return reply({state:'connection_verified',delivery_verified:false});
    }catch(error){
      const state=adminMailFailureState(error);
      console.warn(action==='send_test'?'admin_mail_test':'admin_mail_verification',state);
      return reply({state:action==='send_test'&&state==='verification_failed'?'test_failed':state},502);
    }finally{transport.close();}
  }catch{
    // Provider messages can contain credentials or addresses. Never expose them.
    return reply({state:'verification_failed'},502);
  }
}
export async function GET(request:NextRequest){return handle(request,'read');}
export async function POST(request:NextRequest){
  // NextURL normalizes loopback hosts (127.0.0.1 -> localhost). Compare the
  // browser's Origin with the actual request Host, including its port.
  try{
    const origin=new URL(request.headers.get('origin')||'');
    if(origin.origin!==request.headers.get('origin')||origin.host!==request.headers.get('host')?.toLowerCase()||origin.protocol!==request.nextUrl.protocol)
      return reply({state:'unavailable'},403);
  }catch{return reply({state:'unavailable'},403);}
  return handle(request,request.headers.get('x-rcsca-mail-action')==='send_test'?'send_test':'verify');
}
