'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getSupabaseBrowserClient } from '../../lib/supabase-browser';
import {Locale,useI18n} from '../i18n';

const copy:Record<Locale,any>={
  'zh-Hant':{partner:'共享夥伴',visitor:'一般參觀者',levels:['','共享起點','共享同行者','共享推動者','共享連結者','共享守護者'],loading:'正在讀取你的共享狀態…',identity:'目前身份',guestLead:'登入後才會建立你的 MY 1%、共享足跡與個人進度。',login:'登入／建立 MY 1% →',level:'共享等級',footprints:'共享足跡',database:'已由資料庫讀取',points:'共享點',available:'可用點數',team:'共享小隊',notJoined:'尚未加入',enterprise:'企業身份',none:'無',logout:'安全登出'},
  'en':{partner:'Sharing Partner',visitor:'Visitor',levels:['','Sharing Start','Sharing Companion','Sharing Promoter','Sharing Connector','Sharing Guardian'],loading:'Loading your sharing status…',identity:'Current identity',guestLead:'Sign in to create MY 1%, Sharing Footprints, and personal progress.',login:'Sign in / create MY 1% →',level:'Sharing level',footprints:'Sharing Footprints',database:'Read from verified account data',points:'Sharing Points',available:'Available points',team:'Sharing Team',notJoined:'Not joined',enterprise:'Enterprise identity',none:'None',logout:'Sign out securely'},
  'ja':{partner:'共有パートナー',visitor:'一般訪問者',levels:['','共有の出発点','共有の同行者','共有の推進者','共有のつなぎ手','共有の守り手'],loading:'共有状況を読み込み中…',identity:'現在の身份',guestLead:'ログイン後にMY 1%、共有の足跡、個人の進捗が作成されます。',login:'ログイン／MY 1%を作成 →',level:'共有レベル',footprints:'共有の足跡',database:'アカウントの実データから取得',points:'共有ポイント',available:'利用可能ポイント',team:'共有チーム',notJoined:'未参加',enterprise:'企業情報',none:'なし',logout:'安全にログアウト'},
  'ko':{partner:'공유 파트너',visitor:'일반 방문자',levels:['','공유의 시작','공유 동행자','공유 추진자','공유 연결자','공유 수호자'],loading:'공유 상태 불러오는 중…',identity:'현재 신원',guestLead:'로그인하면 MY 1%, 공유 발자취와 개인 진행 상태가 생성됩니다.',login:'로그인／MY 1% 만들기 →',level:'공유 레벨',footprints:'공유 발자취',database:'계정 실제 데이터에서 조회',points:'공유 포인트',available:'사용 가능 포인트',team:'공유 팀',notJoined:'참여하지 않음',enterprise:'기업 정보',none:'없음',logout:'안전하게 로그아웃'}
};

type Snapshot={
  signedIn:boolean; email?:string; displayName?:string; membership?:string|null;
  level:number; xp:number; points:number; footprints:number; team?:string|null; enterprise?:string|null;
};

export default function LiveAccount(){
  const {locale}=useI18n();const c=copy[locale];
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
      if(alive)setData({signedIn:true,email:session.user.email,displayName:profile.data?.display_name||profile.data?.email||session.user.email||c.partner,membership:membership.data?.status==='active'?membership.data.membership_type:null,level:level.data?.level||1,xp:level.data?.lifetime_xp||0,points:pointTotal,footprints:footprints.data?.length||0,team:teamName,enterprise:enterpriseName});
      if(alive)setLoading(false);
    };
    load();
    const {data:listener}=supabase.auth.onAuthStateChange(()=>load());
    return()=>{alive=false;listener.subscription.unsubscribe();};
  },[locale]);
  const identity=useMemo(()=>!data.signedIn?c.visitor:data.membership?'RCSCA MEMBER':c.partner,[data,locale]);
  const levelNames=c.levels;
  async function logout(){await getSupabaseBrowserClient().auth.signOut();window.location.href='/';}
  if(loading)return <div className="liveAccountLoading">{c.loading}</div>;
  if(!data.signedIn)return <section className="liveAccountGuest"><div><small>{c.identity}</small><strong>{c.visitor}</strong><p>{c.guestLead}</p></div><Link href="/login">{c.login}</Link></section>;
  return <>
    <section className="liveIdentity"><div><small>{c.identity}</small><strong>{identity}</strong><span>{data.displayName}</span></div><div><small>{c.level}</small><strong>Lv.{data.level} · {levelNames[data.level]||levelNames[1]}</strong><span>{data.xp.toLocaleString(locale)} XP</span></div><div><small>{c.footprints}</small><strong>{data.footprints.toLocaleString(locale)}</strong><span>{c.database}</span></div><div><small>{c.points}</small><strong>{data.points.toLocaleString(locale)}</strong><span>{c.available}</span></div></section>
    <section className="liveContext"><div><small>{c.team}</small><strong>{data.team||c.notJoined}</strong></div><div><small>{c.enterprise}</small><strong>{data.enterprise||c.none}</strong></div><button onClick={logout}>{c.logout}</button></section>
  </>;
}
