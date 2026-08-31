'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '../../../lib/supabase-browser';

export default function AuthCallback(){
  const router=useRouter();
  const [message,setMessage]=useState('正在確認登入…');
  useEffect(()=>{
    const run=async()=>{
      const code=new URLSearchParams(window.location.search).get('code');
      if(!code){setMessage('登入連結缺少驗證資訊，請重新登入。');return;}
      const supabase=getSupabaseBrowserClient();
      const {error}=await supabase.auth.exchangeCodeForSession(code);
      if(error){setMessage('登入驗證失敗，請重新寄送登入連結。');return;}
      router.replace('/account'); router.refresh();
    };
    run();
  },[router]);
  return <main className="authCallback"><div><div className="brandRcsca">RCSCA</div><p>{message}</p></div></main>
}
