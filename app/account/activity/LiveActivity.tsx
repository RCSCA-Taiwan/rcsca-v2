'use client';
import { useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '../../../lib/supabase-browser';

type Row={id:string;created_at:string;footprint_type:string;description:string|null;source_type:string};
export default function LiveActivity(){
 const [loading,setLoading]=useState(true); const [signedIn,setSignedIn]=useState(false); const [rows,setRows]=useState<Row[]>([]);
 useEffect(()=>{(async()=>{const supabase=getSupabaseBrowserClient();const {data:{session}}=await supabase.auth.getSession();if(!session){setLoading(false);return;}setSignedIn(true);const {data}=await supabase.from('sharing_footprints').select('id,created_at,footprint_type,description,source_type').eq('user_id',session.user.id).order('created_at',{ascending:false});setRows((data||[]) as Row[]);setLoading(false);})();},[]);
 if(loading)return <p>正在讀取共享足跡…</p>;
 if(!signedIn)return <div className="privacyCallout"><strong>登入後查看自己的共享足跡。</strong><p>一般參觀者不會看到任何個人紀錄。</p><a href="/login">前往登入 →</a></div>;
 if(!rows.length)return <div className="privacyCallout"><strong>目前還沒有已核實的共享足跡。</strong><p>完成公益參與或其他經核實的共享後，紀錄會出現在這裡。</p></div>;
 return <div className="activityTimeline">{rows.map((r,i)=><article key={r.id}><time>{new Date(r.created_at).toLocaleDateString('zh-TW')}</time><div><small>{r.footprint_type==='care'?'公益關懷':'共享連結'}</small><h3>{r.description||'已完成一筆共享'}</h3><p>{r.source_type}</p></div><span>{i===0?'最新':'已記錄'}</span></article>)}</div>;
}
