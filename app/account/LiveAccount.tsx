'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '../../lib/supabase-browser';

type Snapshot={
  signedIn:boolean; email?:string; displayName?:string; membership?:string|null;
  level:number; xp:number; points:number; footprints:number; team?:string|null; enterprise?:string|null;
};

export default function LiveAccount(){
  const [loading,setLoading]=useState(true);
  const [data,setData]=useState<Snapshot>({signedIn:false,level:1,xp:0,points:0,footprints:0,membership:null});
  useEffect(()=>{
    const supabase=getSupabaseBrowserClient();
    let alive=true;
    const load=async()=>{
      const {data:{session}}=await supabase.auth.getSession();
      if(!session){if(alive){setData(d=>({...d,signedIn:false}));setLoading(false);}return;}
      const uid=session.user.id;
      const [profile,membership,level,points,footprints,team,enterprise]=await Promise.all([
        supabase.from('profiles').select('display_name,email').eq('id',uid).maybeSingle(),
        supabase.from('memberships').select('membership_type,status').eq('user_id',uid).maybeSingle(),
        supabase.from('member_levels').select('level,lifetime_xp').eq('user_id',uid).maybeSingle(),
        supabase.from('point_transactions').select('points,tx_type').eq('user_id',uid),
        supabase.from('sharing_footprints').select('id').eq('user_id',uid),
        supabase.from('team_members').select('teams(name)').eq('user_id',uid).is('left_at',null).limit(1).maybeSingle(),
        supabase.from('enterprise_users').select('enterprises(display_name,legal_name)').eq('user_id',uid).limit(1).maybeSingle(),
      ]);
      const pointTotal=(points.data||[]).reduce((sum:any,row:any)=>sum+(row.tx_type==='spend'?-Math.abs(row.points):row.points),0);
      const teamName=(team.data as any)?.teams?.name || null;
      const enterpriseName=(enterprise.data as any)?.enterprises?.display_name || (enterprise.data as any)?.enterprises?.legal_name || null;
      if(alive)setData({signedIn:true,email:session.user.email,displayName:profile.data?.display_name||profile.data?.email||session.user.email||'共享夥伴',membership:membership.data?.status==='active'?membership.data.membership_type:null,level:level.data?.level||1,xp:level.data?.lifetime_xp||0,points:pointTotal,footprints:footprints.data?.length||0,team:teamName,enterprise:enterpriseName});
      if(alive)setLoading(false);
    };
    load();
    const {data:listener}=supabase.auth.onAuthStateChange(()=>load());
    return()=>{alive=false;listener.subscription.unsubscribe();};
  },[]);
  const identity=useMemo(()=>!data.signedIn?'一般參觀者':data.membership?'RCSCA MEMBER':'共享夥伴',[data]);
  const levelNames=['','共享起點','共享同行者','共享推動者','共享連結者','共享守護者'];
  async function logout(){await getSupabaseBrowserClient().auth.signOut();window.location.href='/';}
  if(loading)return <div className="liveAccountLoading">正在讀取你的共享狀態…</div>;
  if(!data.signedIn)return <section className="liveAccountGuest"><div><small>目前身份</small><strong>一般參觀者</strong><p>登入後才會建立你的 MY 1%、共享足跡與個人進度。</p></div><Link href="/login">登入／建立 MY 1% →</Link></section>;
  return <>
    <section className="liveIdentity"><div><small>目前身份</small><strong>{identity}</strong><span>{data.displayName}</span></div><div><small>共享等級</small><strong>Lv.{data.level} · {levelNames[data.level]||'共享起點'}</strong><span>{data.xp.toLocaleString()} XP</span></div><div><small>共享足跡</small><strong>{data.footprints}</strong><span>已由資料庫讀取</span></div><div><small>共享點</small><strong>{data.points.toLocaleString()}</strong><span>可用點數</span></div></section>
    <section className="liveContext"><div><small>共享小隊</small><strong>{data.team||'尚未加入'}</strong></div><div><small>企業身份</small><strong>{data.enterprise||'無'}</strong></div><button onClick={logout}>安全登出</button></section>
  </>;
}
