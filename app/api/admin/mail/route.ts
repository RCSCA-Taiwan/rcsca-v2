import {NextResponse,type NextRequest} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import {adminMailConfig} from '../../../../lib/admin-mail-config.mjs';

export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;
function reply(body:Record<string,unknown>,status=200){
  return NextResponse.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
}
async function authorize(request:NextRequest){
  const header=request.headers.get('authorization')||'';
  if(!header.startsWith('Bearer ')||header.length>8192)return 401;
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return 503;
  const token=header.slice(7);
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:header}}});
  const {data,error}=await client.auth.getUser(token);
  if(error||!data.user)return 401;
  // This RPC checks the authoritative admin role in the database.
  const routing=await client.rpc('admin_site_mail_routing');
  return routing.error?403:200;
}
async function handle(request:NextRequest,verify:boolean){
  try{
    const access=await authorize(request);
    if(access!==200)return reply({state:'unavailable'},access);
    const config=adminMailConfig(process.env);
    if(config.state!=='configured')return reply({state:config.state},verify?503:200);
    if(!verify)return reply({state:'configured'});
    const transport=nodemailer.createTransport({
      host:config.host,port:config.port,secure:config.port===465,requireTLS:config.port===587,
      auth:{user:config.user,pass:config.pass},
      tls:{minVersion:'TLSv1.2',rejectUnauthorized:true},
      connectionTimeout:10000,greetingTimeout:10000,socketTimeout:10000,
      logger:false,debug:false,disableFileAccess:true,disableUrlAccess:true,
    });
    try{
      // SMTP verification authenticates without sending any message.
      await transport.verify();
      return reply({state:'connection_verified',delivery_verified:false});
    }finally{transport.close();}
  }catch{
    // Provider messages can contain credentials or addresses. Never expose them.
    return reply({state:'verification_failed'},502);
  }
}
export async function GET(request:NextRequest){return handle(request,false);}
export async function POST(request:NextRequest){
  if(request.headers.get('origin')!==request.nextUrl.origin)return reply({state:'unavailable'},403);
  return handle(request,true);
}
