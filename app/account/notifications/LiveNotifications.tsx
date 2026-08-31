'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {getSupabaseBrowserClient} from '../../../lib/supabase-browser';
type N={id:string;kind:string;title:string;body:string|null;related_type:string|null;related_id:string|null;read_at:string|null;created_at:string};
export default function LiveNotifications(){
 const [loading,setLoading]=useState(true),[signedIn,setSignedIn]=useState(false),[rows,setRows]=useState<N[]>([]),[notice,setNotice]=useState('');
 async function load(){const s=getSupabaseBrowserClient();const {data:{session}}=await s.auth.getSession();setSignedIn(!!session);if(!session){setLoading(false);return;}const {data,error}=await s.from('user_notifications').select('id,kind,title,body,related_type,related_id,read_at,created_at').order('created_at',{ascending:false}).limit(50);if(error)setNotice('目前無法讀取通知。');else setRows((data||[]) as N[]);setLoading(false)}
 useEffect(()=>{load()},[]);
 async function mark(id:string,read:boolean){const s=getSupabaseBrowserClient();const {error}=await s.from('user_notifications').update({read_at:read?new Date().toISOString():null}).eq('id',id);if(!error)await load()}
 if(loading)return <div className="liveAccountLoading">正在讀取通知…</div>;
 if(!signedIn)return <div className="liveAccountGuest"><div><small>我的通知</small><strong>登入後才會看到自己的進度。</strong><p>企業審核、公益核實與媒合聯絡同意都會在這裡留下通知。</p></div><Link href="/login">登入 →</Link></div>;
 return <>{notice&&<div className="workflowNotice">{notice}</div>}<div className="notificationList">{rows.length?rows.map(n=><article className={n.read_at?'':'unread'} key={n.id}><div><small>{new Date(n.created_at).toLocaleString('zh-TW')}</small><h3>{n.title}</h3><p>{n.body||'狀態已更新。'}</p></div><button onClick={()=>mark(n.id,!n.read_at)}>{n.read_at?'標為未讀':'我知道了'}</button></article>):<div className="emptyData">目前沒有新的通知。</div>}</div></>;
}
