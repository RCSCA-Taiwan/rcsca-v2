'use client';
import {useEffect,useState} from 'react';
import {getSupabaseBrowserClient} from '../../../lib/supabase-browser';
type Badge={id:string;year:number;badge_label:string;issued_at:string|null;expires_at:string|null;status:string};
export default function LivePartnerBadge(){
 const [badge,setBadge]=useState<Badge|null>(null),[loaded,setLoaded]=useState(false);
 useEffect(()=>{(async()=>{try{const s=getSupabaseBrowserClient();const {data:{session}}=await s.auth.getSession();if(!session)return;const {data:eu}=await s.from('enterprise_users').select('enterprise_id').eq('user_id',session.user.id).limit(1).maybeSingle();if(!eu?.enterprise_id)return;const {data}=await s.from('enterprise_badges').select('id,year,badge_label,issued_at,expires_at,status').eq('enterprise_id',eu.enterprise_id).order('year',{ascending:false}).limit(1).maybeSingle();setBadge(data as Badge|null)}finally{setLoaded(true)}})()},[]);
 if(!loaded)return null;
 return <section className="partnerBadgePanel"><div><small>年度共享標章</small>{badge?.status==='issued'?<><h3>{badge.year} · {badge.badge_label}</h3><p>這張標章代表該年度有經 RCSCA 核實的實際共享紀錄，不是付費認證或企業推薦。</p><a className="textRoute" href={`/1percent-partner/badge/${badge.id}`}>查看公開驗證頁 →</a></>:<><h3>目前沒有有效年度標章</h3><p>年度標章由 RCSCA 依實際完成並核實的共享紀錄核發；不是加入企業方案後自動取得。</p></>}</div><span className="oneMark"><b>1</b><i>%</i></span></section>;
}
