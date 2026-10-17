'use client';
import {useEffect,useRef,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database,Json} from '../../../lib/database.types';
import {getSupabaseBrowserClient} from '../../../lib/supabase-browser';
type D=Omit<Database,'public'>&{public:Omit<Database['public'],'Functions'>&{Functions:Database['public']['Functions']&{admin_site_mail_routing:{Args:Record<PropertyKey,never>;Returns:Json}}}};
type Routing={recipient_email?:string;subject_prefix?:string;gmail_label?:string};
const messages:Record<string,string>={
  loading:'正在確認管理通知的寄信設定…',
  not_configured:'管理通知尚未設定獨立寄信憑證。登入／驗證信與審核通知分開設定。',
  invalid:'管理通知寄信設定有誤，請檢查寄件帳號、伺服器與連接埠。',
  configured:'管理通知寄信設定已填入，尚未測試連線。',
  connection_verified:'SMTP 連線與帳密驗證通過；尚未驗證實際收信。',
  verification_failed:'SMTP 連線驗證失敗，請檢查管理通知寄信設定。',
  unavailable:'目前無法確認管理通知設定，請重新登入具管理權限的帳號後再試。',
};
export default function MailRoutingStatus(){
  const[routing,setRouting]=useState<Routing|null>(null),[state,setState]=useState('loading'),[busy,setBusy]=useState(false);
  const submitting=useRef(false);
  useEffect(()=>{
    let alive=true;
    void(async()=>{
      try{
        const client=getSupabaseBrowserClient();
        const result=await(client as unknown as SupabaseClient<D>).rpc('admin_site_mail_routing');
        if(result.error||!alive)return;
        setRouting(result.data as unknown as Routing);
        const {data:{session}}=await client.auth.getSession();
        if(!session)throw new Error('unauthorized');
        const response=await fetch('/api/admin/mail',{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store'});
        const resultState=await response.json();
        if(alive)setState(response.ok?resultState.state:'unavailable');
      }catch{if(alive)setState('unavailable');}
    })();
    return()=>{alive=false;};
  },[]);
  async function verify(){
    if(submitting.current)return;
    submitting.current=true;setBusy(true);
    try{
      const {data:{session}}=await getSupabaseBrowserClient().auth.getSession();
      if(!session)throw new Error('unauthorized');
      const response=await fetch('/api/admin/mail',{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`}});
      const result=await response.json();
      setState(messages[result.state]?result.state:'unavailable');
    }catch{setState('unavailable');}
    finally{submitting.current=false;setBusy(false);}
  }
  if(!routing)return null;
  return <section className="privacyCallout" id="mail-routing"><h2>官網通知信設定</h2>
    {routing.recipient_email?<><p>管理通知收件人：<strong>{routing.recipient_email}</strong></p><p>主旨前綴：{routing.subject_prefix} · Gmail 標籤：{routing.gmail_label}</p></>:<p>尚未指定管理通知收件人。</p>}
    <p role="status">{messages[state]||messages.unavailable}</p>
    <button disabled={busy||!['configured','connection_verified','verification_failed'].includes(state)} onClick={()=>void verify()}>{busy?'正在驗證 SMTP…':'檢查寄信連線（不寄信）'}</button>
    <p><strong>審核通知尚未啟用自動寄送。</strong>目前仍請使用各審核後台處理待辦；連線驗證通過不代表通知已寄出。</p>
  </section>;
}
