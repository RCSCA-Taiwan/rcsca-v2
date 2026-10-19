'use client';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import MemberHistoryPanel from '../MemberHistory';
import SiteHeader from '../../SiteHeader';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '../../../lib/supabase-browser';
import {Locale,useI18n} from '../../i18n';
import './profile.css';

const recovery:Record<Locale,{read:string;retry:string;form:string;routes:string;apply:string;claim:string;notifications:string;account:string;requests:string}>={
 'zh-Hant':{read:'目前無法確認基本資料，請重新讀取後再修改。',retry:'重新讀取基本資料',form:'基本資料',routes:'個人資料後續操作',apply:'入會／續會與申請進度 →',claim:'歷年會員認領與進度 →',notifications:'查看審核與進度通知 →',account:'返回個人中心 →',requests:'申請需協會審核的資料修改、全部重置或刪除 →'},
 en:{read:'Your basic profile could not be confirmed. Reload before editing.',retry:'Reload basic profile',form:'Basic profile',routes:'Profile next steps',apply:'Membership application and renewal status →',claim:'Historical membership claim and status →',notifications:'Review and progress notifications →',account:'Back to account →',requests:'Request reviewed data changes, a full reset or deletion →'},
 ja:{read:'基本情報を確認できません。再読み込みしてから編集してください。',retry:'基本情報を再読み込み',form:'基本情報',routes:'個人情報の次の操作',apply:'入会・更新申請と進捗 →',claim:'過去の会員記録の申請と進捗 →',notifications:'審査と進捗の通知 →',account:'個人センターへ戻る →',requests:'協会の審査が必要な情報変更・全リセット・削除を申請 →'},
 ko:{read:'기본 정보를 확인할 수 없습니다. 다시 불러온 뒤 수정해 주세요.',retry:'기본 정보 다시 불러오기',form:'기본 정보',routes:'개인 정보 다음 단계',apply:'회원 가입·갱신 신청과 진행 상황 →',claim:'기존 회원 기록 연결과 진행 상황 →',notifications:'심사 및 진행 알림 →',account:'개인 센터로 돌아가기 →',requests:'협회 심사가 필요한 정보 변경·전체 초기화·삭제 신청 →'}
};

const copy:Record<Locale,any>={
 'zh-Hant':{saving:'儲存中…',signinShort:'請先登入。',failed:'儲存失敗，請稍後再試。',saved:'已儲存。',eye:'我的資料',title:'只保留使用服務真正需要的基本資料。',lead:'身份、會籍、共享等級與後台角色不能由個人自行修改。',loading:'正在讀取…',signin:'請先登入',signinLead:'登入後才能管理自己的基本資料。',go:'前往登入 →',name:'顯示名稱',namePlaceholder:'例如：王小明',mobile:'手機',save:'儲存基本資料'},
 'en':{saving:'Saving…',signinShort:'Please sign in first.',failed:'Save failed. Please try again later.',saved:'Saved.',eye:'My Profile',title:'Keep only the basic data genuinely needed for the service.',lead:'Identity, membership, Sharing Level, and administrative roles cannot be edited by the user.',loading:'Loading…',signin:'Please sign in',signinLead:'Sign in to manage your basic profile.',go:'Go to sign in →',name:'Display name',namePlaceholder:'Example: Alex Chen',mobile:'Mobile phone',save:'Save basic profile'},
 'ja':{saving:'保存中…',signinShort:'ログインしてください。',failed:'保存できません。後ほど再度お試しください。',saved:'保存しました。',eye:'自分の情報',title:'サービスに本当に必要な基本情報だけを保持します。',lead:'身份、会員資格、共有レベル、管理者ロールは本人が変更できません。',loading:'読み込み中…',signin:'ログインしてください',signinLead:'ログイン後に基本情報を管理できます。',go:'ログインへ →',name:'表示名',namePlaceholder:'例：山田太郎',mobile:'携帯電話',save:'基本情報を保存'},
 'ko':{saving:'저장 중…',signinShort:'먼저 로그인해 주세요.',failed:'저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',saved:'저장했습니다.',eye:'나의 정보',title:'서비스에 실제로 필요한 기본 정보만 보관합니다.',lead:'신원, 회원 자격, 공유 레벨 및 관리자 역할은 사용자가 직접 수정할 수 없습니다.',loading:'불러오는 중…',signin:'로그인이 필요합니다',signinLead:'로그인 후 본인의 기본 정보를 관리할 수 있습니다.',go:'로그인으로 →',name:'표시 이름',namePlaceholder:'예: 홍길동',mobile:'휴대전화',save:'기본 정보 저장'}
};

export default function ProfilePage(){
  const {locale}=useI18n();const c=copy[locale],r=recovery[locale];
  const [state,setState]=useState<'loading'|'guest'|'ready'|'error'>('loading');
  const [name,setName]=useState('');
  const [mobile,setMobile]=useState('');
  const [message,setMessage]=useState<'saved'|'failed'|''>(''),[busy,setBusy]=useState(false);
  const saving=useRef(false),edited=useRef(false),request=useRef(0),owner=useRef<string|null>(null);
  const load=useCallback(async()=>{
    const sequence=++request.current;setState('loading');
    try{
      const s=getSupabaseBrowserClient();const {data:{user},error:authError}=await s.auth.getUser();if(authError)throw authError;
      if(sequence!==request.current)return;
      if(!user){owner.current=null;edited.current=false;setName('');setMobile('');setState('guest');return;}
      if(owner.current!==user.id){owner.current=user.id;edited.current=false;}
      const {data,error}=await s.from('profiles').select('display_name,mobile').eq('id',user.id).maybeSingle();if(error)throw error;
      if(sequence!==request.current)return;
      if(!data||!(data.display_name===null||typeof data.display_name==='string')||!(data.mobile===null||typeof data.mobile==='string'))throw new Error('profile_unavailable');
      if(!edited.current){setName(data.display_name||'');setMobile(data.mobile||'');}setState('ready');
    }catch{if(sequence===request.current)setState('error');}
  },[]);
  useEffect(()=>{void load();return()=>{request.current++;};},[load]);
  async function save(e:FormEvent){e.preventDefault();if(saving.current||busy||state!=='ready')return;saving.current=true;setBusy(true);setMessage('');
    try{
      const s=getSupabaseBrowserClient();const {data:{user},error:authError}=await s.auth.getUser();if(authError||!user||user.id!==owner.current)throw new Error('authentication_required');
      const {error}=await s.rpc('account_update_basic_profile',{p_display_name:name,p_mobile:mobile});if(error)throw error;
      edited.current=false;setMessage('saved');await load();
    }catch{setMessage('failed');}finally{saving.current=false;setBusy(false);}
  }
  return <main className="flowPage"><SiteHeader/><section className="flowHero"><div className="portalWrap"><div className="eyebrow">{c.eye}</div><h1>{c.title}</h1><p>{c.lead}</p></div></section><section className="portalSection"><div className="portalWrap">
    <section className="basicProfile" aria-label={r.form} aria-busy={state==='loading'||busy}>
      {state==='loading'?<p role="status">{c.loading}</p>:state==='error'?<p className="workflowNotice" role="alert">{r.read}</p>:state==='guest'?<div className="privacyCallout"><strong>{c.signin}</strong><p>{c.signinLead}</p><Link href="/login?next=%2Faccount%2Fprofile">{c.go}</Link></div>:<form className="authForm" aria-label={r.form} onChange={()=>{edited.current=true;}} onSubmit={save}><fieldset disabled={busy}><legend>{r.form}</legend><label>{c.name}<input autoComplete="nickname" value={name} onChange={e=>setName(e.target.value)} placeholder={c.namePlaceholder}/></label><label>{c.mobile}<input type="tel" autoComplete="tel" value={mobile} onChange={e=>setMobile(e.target.value)} placeholder="09XXXXXXXX"/></label><button disabled={busy}>{busy?c.saving:c.save}</button></fieldset></form>}
      {message&&<p className="workflowNotice" role={message==='failed'?'alert':'status'}>{c[message]}</p>}
      <button className="profileRefresh" type="button" disabled={state==='loading'||busy} onClick={()=>{setMessage('');void load();}}>{r.retry}</button>
    </section>
    <MemberHistoryPanel/>
    <nav className="profileRoutes" aria-label={r.routes}><Link href="/membership/apply">{r.apply}</Link><Link href="/membership/claim">{r.claim}</Link><Link href="/account/notifications">{r.notifications}</Link><Link href="/account/data-requests">{r.requests}</Link><Link href="/account">{r.account}</Link></nav>
  </div></section></main>
}
