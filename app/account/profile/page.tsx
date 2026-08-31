'use client';
import { FormEvent, useEffect, useState } from 'react';
import SiteHeader from '../../SiteHeader';
import { getSupabaseBrowserClient } from '../../../lib/supabase-browser';

export default function ProfilePage(){
  const [loading,setLoading]=useState(true);
  const [signedIn,setSignedIn]=useState(false);
  const [name,setName]=useState('');
  const [mobile,setMobile]=useState('');
  const [message,setMessage]=useState('');
  useEffect(()=>{(async()=>{
    const supabase=getSupabaseBrowserClient();
    const {data:{session}}=await supabase.auth.getSession();
    if(!session){setLoading(false);return;}
    setSignedIn(true);
    const {data}=await supabase.from('profiles').select('display_name,mobile').eq('id',session.user.id).maybeSingle();
    setName(data?.display_name||''); setMobile(data?.mobile||''); setLoading(false);
  })();},[]);
  async function save(e:FormEvent){e.preventDefault();setMessage('儲存中…');
    const supabase=getSupabaseBrowserClient(); const {data:{session}}=await supabase.auth.getSession();
    if(!session){setMessage('請先登入。');return;}
    const {error}=await supabase.from('profiles').update({display_name:name.trim()||null,mobile:mobile.trim()||null,updated_at:new Date().toISOString()}).eq('id',session.user.id);
    setMessage(error?`儲存失敗：${error.message}`:'已儲存。');
  }
  return <main className="flowPage"><SiteHeader/><section className="flowHero"><div className="portalWrap"><div className="eyebrow">我的資料</div><h1>只保留使用服務真正需要的基本資料。</h1><p>身份、會籍、共享等級與後台角色不能由個人自行修改。</p></div></section><section className="portalSection"><div className="portalWrap">{loading?<p>正在讀取…</p>:!signedIn?<div className="privacyCallout"><strong>請先登入</strong><p>登入後才能管理自己的基本資料。</p><a href="/login">前往登入 →</a></div>:<form className="authForm" onSubmit={save}><label>顯示名稱<input value={name} onChange={e=>setName(e.target.value)} placeholder="例如：王小明"/></label><label>手機<input value={mobile} onChange={e=>setMobile(e.target.value)} placeholder="09XXXXXXXX" inputMode="tel"/></label><button>儲存基本資料</button>{message&&<div className="authMessage sent">{message}</div>}</form>}</div></section></main>
}
