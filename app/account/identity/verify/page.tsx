'use client';
import {FormEvent,useCallback,useEffect,useRef,useState} from 'react';
import SiteHeader from '../../../SiteHeader';
import Link from 'next/link';
import '../identity.css';
import {getSupabaseBrowserClient} from '../../../../lib/supabase-browser';
import {useI18n, type Locale} from '../../../i18n';
const copy:Record<Locale,Record<string,string>>={
'zh-Hant':{eyebrow:'身份驗證',hero:'驗證身份，不把敏感識別碼當成會員編號。',lead:'此流程只建立驗證案件。若輸入識別碼，系統僅保存單向雜湊供比對，不保存原始內容。',loading:'正在讀取…',signin:'請先登入',signinLead:'登入後才能提出自己的身份驗證。',signinCta:'前往登入 →',status:'目前狀態',none:'尚未提出驗證',basic:'基本身份驗證',member:'會員身份資料核對',placeholder:'識別碼（需要比對時才填）',done:'已完成驗證',sending:'送出中…',submit:'送出驗證申請 →',sent:'已送出驗證申請。原始識別碼不會保存在這個流程中。',failed:'送出失敗，請稍後再試。',retry:'請稍後再試',noId:'不以身分證字號當會員編號',noIdLead:'正式會員編號由協會會員資料另外管理。',minimum:'敏感資料最小化',minimumLead:'前台不展示原始識別碼，管理端只處理驗證狀態。',pending:'審核中',verified:'已驗證',rejected:'未通過',unverified:'未驗證'},
'en':{eyebrow:'Identity Verification',hero:'Verify identity without turning sensitive identifiers into membership numbers.',lead:'This process creates a verification case only. If an identifier is entered, the system stores only a one-way hash for comparison and does not retain the original value.',loading:'Loading…',signin:'Please sign in first',signinLead:'You must be signed in to request your own identity verification.',signinCta:'Go to sign in →',status:'Current status',none:'No verification request yet',basic:'Basic identity verification',member:'Membership identity review',placeholder:'Identifier (only when comparison is required)',done:'Verification completed',sending:'Submitting…',submit:'Submit verification request →',sent:'Verification request submitted. The original identifier is not retained in this process.',failed:'Submission failed. Please try again later.',retry:'Please try again later',noId:'Government ID is not used as your member number',noIdLead:'Official member numbers are managed separately in RCSCA membership records.',minimum:'Data minimization',minimumLead:'The original identifier is never displayed in the member interface; administrators only handle verification status.',pending:'Under review',verified:'Verified',rejected:'Not approved',unverified:'Not verified'},
'ja':{eyebrow:'本人確認',hero:'本人確認をしても、機微な識別番号を会員番号にはしません。',lead:'この手続きは本人確認案件を作成するためのものです。識別番号を入力した場合も、照合用の一方向ハッシュのみを保存し、元の値は保存しません。',loading:'読み込み中…',signin:'先にログインしてください',signinLead:'本人確認を申請するにはログインが必要です。',signinCta:'ログインへ →',status:'現在の状況',none:'まだ本人確認を申請していません',basic:'基本本人確認',member:'会員本人情報の確認',placeholder:'識別番号（照合が必要な場合のみ）',done:'本人確認完了',sending:'送信中…',submit:'本人確認を申請 →',sent:'本人確認申請を送信しました。元の識別番号はこの手続きでは保存されません。',failed:'送信できませんでした。後ほど再度お試しください。',retry:'しばらくしてから再度お試しください',noId:'身分証番号を会員番号には使用しません',noIdLead:'正式な会員番号はRCSCAの会員情報で別途管理します。',minimum:'機微情報の最小化',minimumLead:'元の識別番号は会員画面に表示せず、管理側は確認ステータスのみを扱います。',pending:'審査中',verified:'確認済み',rejected:'未承認',unverified:'未確認'},
'ko':{eyebrow:'신원 확인',hero:'신원을 확인하되 민감한 식별번호를 회원번호로 사용하지 않습니다.',lead:'이 절차는 신원 확인 건을 생성하기 위한 것입니다. 식별번호를 입력해도 비교용 단방향 해시만 저장하며 원본 값은 보관하지 않습니다.',loading:'불러오는 중…',signin:'먼저 로그인해 주세요',signinLead:'본인의 신원 확인을 신청하려면 로그인이 필요합니다.',signinCta:'로그인하기 →',status:'현재 상태',none:'아직 신원 확인 신청이 없습니다',basic:'기본 신원 확인',member:'회원 신원 정보 확인',placeholder:'식별번호(비교가 필요한 경우에만 입력)',done:'신원 확인 완료',sending:'제출 중…',submit:'신원 확인 신청 제출 →',sent:'신원 확인 신청을 제출했습니다. 원본 식별번호는 이 절차에 저장되지 않습니다.',failed:'제출하지 못했습니다. 잠시 후 다시 시도해 주세요.',retry:'잠시 후 다시 시도해 주세요',noId:'정부 발급 신분번호를 회원번호로 사용하지 않습니다',noIdLead:'공식 회원번호는 RCSCA 회원 기록에서 별도로 관리합니다.',minimum:'민감정보 최소화',minimumLead:'원본 식별번호는 회원 화면에 표시하지 않으며 관리자는 확인 상태만 처리합니다.',pending:'검토 중',verified:'확인 완료',rejected:'승인되지 않음',unverified:'미확인'}};

const flowCopy:Record<Locale,{loadError:string;retry:string;back:string;notifications:string;kind:string;token:string;pending:string}>={
 'zh-Hant':{loadError:'目前無法確認驗證進度，請重新讀取後再送出。',retry:'重新讀取驗證進度',back:'回到身份與使用權限 →',notifications:'查看審核通知 →',kind:'驗證類型',token:'識別碼（需要比對時才填）',pending:'申請已送出，正在等候協會審核。'},
 en:{loadError:'Verification progress could not be confirmed. Reload before submitting.',retry:'Reload verification progress',back:'Back to identity and access →',notifications:'View review notifications →',kind:'Verification type',token:'Identifier (only when comparison is required)',pending:'Your application is awaiting association review.'},
 ja:{loadError:'本人確認の進捗を確認できませんでした。再読み込み後に申請してください。',retry:'本人確認の進捗を再読み込み',back:'本人情報と利用権限へ戻る →',notifications:'審査通知を確認 →',kind:'確認の種類',token:'識別番号（照合が必要な場合のみ）',pending:'申請は協会の審査待ちです。'},
 ko:{loadError:'신원 확인 진행 상황을 확인하지 못했습니다. 다시 불러온 후 제출하세요.',retry:'신원 확인 진행 다시 불러오기',back:'신원 및 이용 권한으로 →',notifications:'심사 알림 보기 →',kind:'확인 유형',token:'식별번호 (비교가 필요한 경우에만)',pending:'신청이 협회 심사를 기다리고 있습니다.'}
};
export default function VerifyIdentity(){
 const {locale}=useI18n();const c=copy[locale],f=flowCopy[locale];
 const [signedIn,setSignedIn]=useState(false),[loading,setLoading]=useState(true),[status,setStatus]=useState(''),[kind,setKind]=useState('basic_identity'),[token,setToken]=useState(''),[message,setMessage]=useState(''),[messageError,setMessageError]=useState(false),[busy,setBusy]=useState(false),[loadFailed,setLoadFailed]=useState(false);
 const request=useRef(0),submitting=useRef(false);
 const load=useCallback(async()=>{
  const sequence=++request.current;setLoading(true);
  try{
   const s=getSupabaseBrowserClient();
   const {data:{session},error}=await s.auth.getSession();if(error)throw error;
   if(sequence!==request.current)return;
   setSignedIn(!!session);
   if(!session){setStatus('');setLoadFailed(false);return;}
   const {data,error:readError}=await s.from('identity_verifications').select('status,verification_kind').eq('user_id',session.user.id).order('created_at',{ascending:false}).limit(1).maybeSingle();
   if(readError)throw readError;
   if(sequence!==request.current)return;
   setStatus(data?.status||'');setKind(data?.verification_kind||'basic_identity');setLoadFailed(false);
  }catch{if(sequence===request.current)setLoadFailed(true);}
  finally{if(sequence===request.current)setLoading(false);}
 },[]);
 useEffect(()=>{void load();return ()=>{request.current++;};},[load]);
 async function submit(e:FormEvent){
  e.preventDefault();if(submitting.current||busy||loading||loadFailed||!signedIn||status==='verified')return;
  submitting.current=true;setBusy(true);setMessage('');setMessageError(false);
  try{
   const s=getSupabaseBrowserClient();const {error}=await s.rpc('request_identity_verification',{p_verification_kind:kind,p_identity_token:token||undefined});if(error)throw error;
   setToken('');setStatus('pending');setMessage(c.sent);await load();
  }catch{setMessage(c.failed);setMessageError(true);}
  finally{submitting.current=false;setBusy(false);}
 }
 const labels:Record<string,string>={pending:c.pending,verified:c.verified,rejected:c.rejected,unverified:c.unverified};
 return <main className="flowPage"><SiteHeader/>
  <section className="flowHero"><div className="portalWrap"><div className="eyebrow">{c.eyebrow}</div><h1>{c.hero}</h1><p>{c.lead}</p></div></section>
  <section className="portalSection"><div className="portalWrap identityVerification" aria-busy={loading||busy}>
   {message&&<div className="workflowNotice" role={messageError?'alert':'status'}>{message}</div>}
   {loading?<div className="liveAccountLoading" role="status">{c.loading}</div>:loadFailed?<div className="privacyCallout"><p role="alert">{f.loadError}</p><button className="identityRetry" type="button" disabled={busy} onClick={()=>void load()}>{f.retry}</button></div>:!signedIn?<div className="privacyCallout"><strong>{c.signin}</strong><p>{c.signinLead}</p><Link href="/login?next=%2Faccount%2Fidentity%2Fverify">{c.signinCta}</Link></div>:<div className="actionForm">
    <form onSubmit={submit} aria-label={c.eyebrow}>
     <div className="privacyCallout"><strong>{c.status}</strong><p>{status?labels[status]||f.loadError:c.none}</p>{status==='pending'&&<p>{f.pending}</p>}</div>
     <button className="identityRetry" type="button" disabled={busy} onClick={()=>void load()}>{f.retry}</button>
     <fieldset disabled={busy||status==='verified'}><div className="briefFields">
      <label>{f.kind}<select value={kind} onChange={e=>setKind(e.target.value)}><option value="basic_identity">{c.basic}</option><option value="membership_identity">{c.member}</option></select></label>
      <label>{f.token}<input type="password" value={token} onChange={e=>setToken(e.target.value)} placeholder={c.placeholder} autoComplete="off"/></label>
     </div><button className="submitLead" disabled={busy||status==='verified'}>{status==='verified'?c.done:busy?c.sending:c.submit}</button></fieldset>
    </form>
    <aside><b>{c.noId}</b><p>{c.noIdLead}</p><b>{c.minimum}</b><p>{c.minimumLead}</p></aside>
   </div>}
   <nav className="identityRoutes privacyCallout" aria-label={c.eyebrow}><Link href="/account/identity">{f.back}</Link><Link href="/account/notifications">{f.notifications}</Link></nav>
  </div></section>
 </main>;
}
