'use client';
import {useEffect,useState} from 'react';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {Database,Json} from '../../../lib/database.types';
import {getSupabaseBrowserClient} from '../../../lib/supabase-browser';
type D=Omit<Database,'public'>&{public:Omit<Database['public'],'Functions'>&{Functions:Database['public']['Functions']&{admin_site_mail_routing:{Args:Record<PropertyKey,never>;Returns:Json}}}};
type Routing={recipient_email?:string;subject_prefix?:string;gmail_label?:string;delivery_status:string};
export default function MailRoutingStatus(){const[routing,setRouting]=useState<Routing|null>(null);useEffect(()=>{let alive=true;void (getSupabaseBrowserClient() as unknown as SupabaseClient<D>).rpc('admin_site_mail_routing').then(({data,error})=>{if(alive&&!error)setRouting(data as unknown as Routing)});return()=>{alive=false}},[]);if(!routing)return null;return <section className="privacyCallout" id="mail-routing"><h2>官網通知信設定</h2>{routing.recipient_email?<><p>管理通知收件人：<strong>{routing.recipient_email}</strong></p><p>主旨前綴：{routing.subject_prefix} · Gmail 標籤：{routing.gmail_label}</p></>:<p>尚未指定管理通知收件人。</p>}<p><strong>寄信服務尚未接通。</strong>目前請使用本頁及各審核後台處理待辦；收件設定不代表已寄出通知信。</p></section>}
