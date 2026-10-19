'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {getHistoryClient,historyError,type MemberHistory} from '../../../lib/member-history';
import './claim.css';
type Preview={status:'manual'|'matched';membership_type?:string;member_since?:string;membership_year?:number};
type LoadState='loading'|'guest'|'ready'|'error';
const claimLabels={pending:'待協會核對',approved:'已核准',rejected:'未通過'};

export default function LegacyClaimForm(){
 const [state,setState]=useState<LoadState>('loading'),[history,setHistory]=useState<MemberHistory|null>(null);
 const [name,setName]=useState(''),[phone,setPhone]=useState(''),[identity,setIdentity]=useState(''),[consent,setConsent]=useState(false),[preview,setPreview]=useState<Preview|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[messageError,setMessageError]=useState(false);
 const active=useRef(false),request=useRef(0);
 const load=useCallback(async()=>{
  const sequence=++request.current;setState('loading');
  try{
   const s=getHistoryClient();const {data:{user},error:authError}=await s.auth.getUser();if(authError)throw authError;
   if(sequence!==request.current)return;
   if(!user){setHistory(null);setState('guest');return;}
   const {data,error}=await s.rpc('member_history_self');if(error)throw error;
   if(!data||typeof data!=='object'||Array.isArray(data)||!('claim' in data))throw new Error('Invalid claim history');
   const h=data as unknown as MemberHistory;
   if(h.claim!==null&&(!h.claim||typeof h.claim!=='object'||!['pending','approved','rejected'].includes(h.claim.status)))throw new Error('Invalid claim status');
   if(sequence===request.current){setHistory(h);setState('ready');}
  }catch{if(sequence===request.current)setState('error');}
 },[]);
 useEffect(()=>{void load();return ()=>{request.current++;};},[load]);
 const claim=history?.claim;
 const blocked=claim?.status==='pending'||claim?.status==='approved';
 const editable=state==='ready'&&!blocked;
 async function check(){
  if(active.current||!editable)return;active.current=true;setBusy(true);setMessage('');setMessageError(false);setPreview(null);
  try{const {data,error}=await getHistoryClient().rpc('legacy_member_preview',{p_name:name});if(error)throw error;setPreview(data as unknown as Preview);}
  catch(e){setMessage(historyError(e));setMessageError(true);}finally{active.current=false;setBusy(false);}
 }
 async function submit(e:FormEvent){
  e.preventDefault();if(active.current||!editable)return;active.current=true;setBusy(true);setMessage('');setMessageError(false);
  try{
   const {error}=await getHistoryClient().rpc('legacy_member_claim',{p_name:name,p_phone:phone,p_identity:identity,p_consent:consent});if(error)throw error;
   setIdentity('');setPhone('');setConsent(false);setPreview(null);
   setHistory(previous=>previous?{...previous,claim:{status:'pending',review_note:null}}:previous);
   setMessage('認領申請已送出，請等待協會核對。核准前不變更會籍、積分或小隊。');
  }catch(e){setMessage(historyError(e));setMessageError(true);}finally{active.current=false;setBusy(false);}
 }
 return <div className="membershipWorkspace legacyClaimWorkspace" aria-busy={state==='loading'||busy}>
  {state==='loading'?<p role="status">正在讀取認領進度…</p>:<>
   {message&&<p className="claimNotice workflowNotice" role={messageError?'alert':'status'}>{message}</p>}
   {state==='error'?<p role="alert">目前無法確認認領進度，請重新讀取後再送出。</p>:state==='guest'?<div className="privacyCallout"><p>先登入已驗證的本人帳號。</p><Link href="/login?next=%2Fmembership%2Fclaim">登入</Link> · <Link href="/register?next=%2Fmembership%2Fclaim">註冊個人帳號</Link></div>:<>
    {claim&&<section className="privacyCallout claimProgress" aria-label="歷年會籍認領進度">
     <h2>認領進度：{claimLabels[claim.status]}</h2>
     {claim.review_note&&<p>審核備註：{claim.review_note}</p>}
     {claim.status==='pending'&&<p>申請已在審核中，請等待協會核對；可重新讀取最新進度。</p>}
     {claim.status==='rejected'&&<p>請依審核備註核對資料，再重新送出認領申請。</p>}
     {claim.status==='approved'&&<><p>原有會籍已完成連結，完整身份與年資請至個人資料查看。</p>{history?.member_since&&<p>原始入會日期：{history.member_since}</p>}</>}
    </section>}
    {editable&&<form className="membershipForm" aria-label="歷年會員認領申請" onSubmit={submit}><fieldset disabled={busy}><legend>核對舊名冊</legend>
     <label>會員姓名＊<input required maxLength={100} autoComplete="name" value={name} onChange={e=>{setName(e.target.value);setPreview(null);}}/></label>
     <p><button type="button" disabled={busy||!name.trim()} onClick={()=>void check()}>以已驗證信箱比對</button></p>
     {preview?.status==='matched'?<div className="privacyCallout"><p>已找到信箱與姓名相符的資料，請確認：</p><p>{preview.membership_type==='lifetime'?'永久會員':'一般會員'} · 原入會日期 {preview.member_since} · 最後有效年度 {preview.membership_year}</p><small>資料經協會審核核准後才會連結。</small></div>:<p>若舊名冊尚未匯入、信箱不同或比對不唯一，可補填原電話或身分證，交由協會核對。僅憑電話／證件不會公開或自動帶出名冊資料。</p>}
     {preview?.status!=='matched'&&<div className="membershipFields"><label>舊名冊電話<input type="tel" maxLength={30} value={phone} onChange={e=>setPhone(e.target.value)}/></label><label>身分證字號（可留空）<input type="password" autoComplete="off" minLength={10} maxLength={10} value={identity} onChange={e=>setIdentity(e.target.value.toUpperCase())}/></label></div>}
     <label className="membershipCheck"><input required type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>我確認為本人，並同意協會使用上述資料核對及連結原有會籍。</label>
     <button disabled={busy}>{busy?'處理中…':'送出認領申請'}</button>
    </fieldset></form>}
   </>}
  </>}
  <button className="claimRefresh" type="button" disabled={state==='loading'||busy} onClick={()=>{setMessage('');void load();}}>重新讀取認領進度</button>
  <nav className="claimRoutes" aria-label="會籍與認領後續操作">
   <Link href="/account/profile">查看會籍、年資與生日資料 →</Link>
   <Link href="/membership/apply">入會／續會與申請進度 →</Link>
   <Link href="/account/notifications">查看我的通知 →</Link>
   <Link href="/account">回到個人中心查看認領進度 →</Link>
  </nav>
 </div>;
}
