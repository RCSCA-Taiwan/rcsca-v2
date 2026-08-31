'use client';
import { FormEvent, useState } from 'react';
import SiteHeader from '../SiteHeader';
import { getSupabaseBrowserClient } from '../../lib/supabase-browser';

export default function LoginPage(){
  const [email,setEmail]=useState('');
  const [status,setStatus]=useState<'idle'|'sending'|'sent'|'error'>('idle');
  const [message,setMessage]=useState('');
  async function submit(e:FormEvent){
    e.preventDefault();
    setStatus('sending'); setMessage('');
    try{
      const supabase=getSupabaseBrowserClient();
      const redirectTo=`${window.location.origin}/auth/callback`;
      const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:redirectTo,shouldCreateUser:true}});
      if(error) throw error;
      setStatus('sent');
      setMessage('登入連結已寄出。請到信箱點擊連結完成登入。');
    }catch(err:any){
      setStatus('error'); setMessage(err?.message || '目前無法寄出登入連結，請稍後再試。');
    }
  }
  return <main className="authPage"><SiteHeader/><section className="authShell"><div className="eyebrow">MY 1% · 安全登入</div><h1>用你的 Email 進入 MY 1%。</h1><p>測試階段先採 Email 登入連結，不需要建立密碼。正式上線前再依使用情境評估手機驗證。</p><form onSubmit={submit} className="authForm"><label>電子郵件<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" autoComplete="email"/></label><button disabled={status==='sending'}>{status==='sending'?'寄送中…':'寄送登入連結'}</button></form>{message&&<div className={`authMessage ${status}`}>{message}</div>}<div className="authPrivacy"><strong>這一步不代表加入協會。</strong><span>完成登入後，你會先成為共享夥伴；正式會籍與共享等級仍是不同制度。</span></div></section></main>
}
