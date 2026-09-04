'use client';
import { FormEvent, useEffect, useState } from 'react';
import SiteHeader from '../../SiteHeader';
import { getSupabaseBrowserClient } from '../../../lib/supabase-browser';
import {Locale,useI18n} from '../../i18n';

const copy:Record<Locale,any>={
 'zh-Hant':{saving:'儲存中…',signinShort:'請先登入。',failed:'儲存失敗，請稍後再試。',saved:'已儲存。',eye:'我的資料',title:'只保留使用服務真正需要的基本資料。',lead:'身份、會籍、共享等級與後台角色不能由個人自行修改。',loading:'正在讀取…',signin:'請先登入',signinLead:'登入後才能管理自己的基本資料。',go:'前往登入 →',name:'顯示名稱',namePlaceholder:'例如：王小明',mobile:'手機',save:'儲存基本資料'},
 'en':{saving:'Saving…',signinShort:'Please sign in first.',failed:'Save failed. Please try again later.',saved:'Saved.',eye:'My Profile',title:'Keep only the basic data genuinely needed for the service.',lead:'Identity, membership, Sharing Level, and administrative roles cannot be edited by the user.',loading:'Loading…',signin:'Please sign in',signinLead:'Sign in to manage your basic profile.',go:'Go to sign in →',name:'Display name',namePlaceholder:'Example: Alex Chen',mobile:'Mobile phone',save:'Save basic profile'},
 'ja':{saving:'保存中…',signinShort:'ログインしてください。',failed:'保存できません。後ほど再度お試しください。',saved:'保存しました。',eye:'自分の情報',title:'サービスに本当に必要な基本情報だけを保持します。',lead:'身份、会員資格、共有レベル、管理者ロールは本人が変更できません。',loading:'読み込み中…',signin:'ログインしてください',signinLead:'ログイン後に基本情報を管理できます。',go:'ログインへ →',name:'表示名',namePlaceholder:'例：山田太郎',mobile:'携帯電話',save:'基本情報を保存'},
 'ko':{saving:'저장 중…',signinShort:'먼저 로그인해 주세요.',failed:'저장하지 못했습니다. 잠시 후 다시 시도해 주세요.',saved:'저장했습니다.',eye:'나의 정보',title:'서비스에 실제로 필요한 기본 정보만 보관합니다.',lead:'신원, 회원 자격, 공유 레벨 및 관리자 역할은 사용자가 직접 수정할 수 없습니다.',loading:'불러오는 중…',signin:'로그인이 필요합니다',signinLead:'로그인 후 본인의 기본 정보를 관리할 수 있습니다.',go:'로그인으로 →',name:'표시 이름',namePlaceholder:'예: 홍길동',mobile:'휴대전화',save:'기본 정보 저장'}
};

export default function ProfilePage(){
  const {locale}=useI18n();const c=copy[locale];
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
  })();},[locale]);
  async function save(e:FormEvent){e.preventDefault();setMessage(c.saving);
    const supabase=getSupabaseBrowserClient(); const {data:{session}}=await supabase.auth.getSession();
    if(!session){setMessage(c.signinShort);return;}
    const {error}=await supabase.rpc('account_update_basic_profile',{p_display_name:name,p_mobile:mobile});
    setMessage(error?c.failed:c.saved);
  }
  return <main className="flowPage"><SiteHeader/><section className="flowHero"><div className="portalWrap"><div className="eyebrow">{c.eye}</div><h1>{c.title}</h1><p>{c.lead}</p></div></section><section className="portalSection"><div className="portalWrap">{loading?<p>{c.loading}</p>:!signedIn?<div className="privacyCallout"><strong>{c.signin}</strong><p>{c.signinLead}</p><a href="/login">{c.go}</a></div>:<form className="authForm" onSubmit={save}><label>{c.name}<input value={name} onChange={e=>setName(e.target.value)} placeholder={c.namePlaceholder}/></label><label>{c.mobile}<input value={mobile} onChange={e=>setMobile(e.target.value)} placeholder="09XXXXXXXX" inputMode="tel"/></label><button>{c.save}</button>{message&&<div className="authMessage sent">{message}</div>}</form>}</div></section></main>
}
