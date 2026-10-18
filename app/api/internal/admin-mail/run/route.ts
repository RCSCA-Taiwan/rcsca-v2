import {createClient} from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import {workerAuthorized,runMailWorker} from '../../../../../lib/admin-mail-worker.mjs';
export const dynamic='force-dynamic';
export const maxDuration=180;
const reply=(data:Record<string,unknown>,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function POST(request:Request){
 if(!workerAuthorized(process.env,request.headers.get('authorization')))return reply({state:'unauthorized'},401);
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return reply({state:'unavailable'},503);
 try{
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(15000)})}});
  const result=await runMailWorker(process.env,args=>client.rpc('admin_mail_worker',args),config=>nodemailer.createTransport({
   host:config.host,port:config.port,secure:config.port===465,requireTLS:config.port===587,
   auth:{user:config.user,pass:config.pass},tls:{minVersion:'TLSv1.2',rejectUnauthorized:true},
   connectionTimeout:7000,greetingTimeout:7000,socketTimeout:7000,logger:false,debug:false,disableFileAccess:true,disableUrlAccess:true,
  }));
  return reply(result,result.state==='unknown'||result.state==='configuration_failed'?503:200);
 }catch{
  // Fixed diagnostic only: provider/DB errors may contain credentials or PII.
  console.error('admin_mail_worker_unavailable');
  return reply({state:'unavailable'},503);
 }
}
