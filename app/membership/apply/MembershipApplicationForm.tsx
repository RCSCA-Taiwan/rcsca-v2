'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {getMembershipClient as getSupabaseBrowserClient} from '../../../lib/membership-api';
import {getHistoryClient,type MemberHistory} from '../../../lib/member-history';
import {taiwanDate,membershipError,membershipStatus,type MembershipApplication,type MembershipSource} from '../../../lib/membership';
import './application.css';

export default function MembershipApplicationForm(){
  const [loading,setLoading]=useState(true),[signedIn,setSignedIn]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [progressReady,setProgressReady]=useState(false),[readError,setReadError]=useState(''),[authFailed,setAuthFailed]=useState(false);
  const [applications,setApplications]=useState<MembershipApplication[]>([]);
  const [kind,setKind]=useState<'new'|'renewal'>('new'),[type,setType]=useState<'annual'|'lifetime'>('annual');
  const [name,setName]=useState(''),[identity,setIdentity]=useState(''),[phone,setPhone]=useState(''),[email,setEmail]=useState(''),[address,setAddress]=useState('');
  const [sourceText,setSourceText]=useState(''),[source,setSource]=useState<MembershipSource|null>(null),[sourceLoading,setSourceLoading]=useState(false),[sourceFailed,setSourceFailed]=useState(false),[joinTeam,setJoinTeam]=useState(false),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false);
  const [birthDate,setBirthDate]=useState(''),[greetings,setGreetings]=useState(false);
  const submitting=useRef(false),edited=useRef(false),request=useRef(0);
  const load=useCallback(async()=>{
    const sequence=++request.current;setReadError('');setLoading(true);setReady(false);setProgressReady(false);
    try{
      const s=getSupabaseBrowserClient();const {data,error:authError}=await s.auth.getUser();if(authError)throw authError;
      if(sequence!==request.current)return;
      setAuthFailed(false);
      if(!data.user){setSignedIn(false);setApplications([]);return;}setSignedIn(true);
      const [a,m,h]=await Promise.allSettled([
        s.rpc('membership_applications_self'),
        s.from('memberships').select('membership_type').eq('user_id',data.user.id).maybeSingle(),
        getHistoryClient().rpc('member_history_self')
      ]);
      if(sequence!==request.current)return;
      const rows=a.status==='fulfilled'&&!a.value.error&&Array.isArray(a.value.data)?a.value.data as unknown as MembershipApplication[]:null;
      setApplications(rows||[]);setProgressReady(rows!==null);
      const membership=m.status==='fulfilled'&&!m.value.error?m.value.data:null;
      const details=h.status==='fulfilled'&&!h.value.error?h.value.data as unknown as MemberHistory:null;
      const formSourcesReady=m.status==='fulfilled'&&!m.value.error&&details!==null&&typeof details==='object'&&typeof details.greetings_consent==='boolean'&&(details.birth_date===null||typeof details.birth_date==='string');
      if(rows===null){setReadError('目前無法確認申請進度，請重新讀取後再送出。');return;}
      if(!formSourcesReady){setReadError('申請進度已讀取，但會籍或生日資料暫時無法確認，請重新讀取後再填寫申請。');return;}
      if(!edited.current){
        setBirthDate(details.birth_date||'');setGreetings(details.greetings_consent);
        if(rows[0]){
          const latest=rows[0];setName(latest.full_name);setPhone(latest.phone);setEmail(latest.email);setAddress(latest.address);setKind(latest.application_kind);setType(latest.membership_type);setSourceText(latest.referrer_text||'');
        }else{
          setName('');setPhone('');setAddress('');setSourceText('');setEmail(data.user.email||'');
          setKind(membership?'renewal':'new');setType(membership?.membership_type==='lifetime'?'lifetime':'annual');
        }
      }
      setReady(true);
    }catch{if(sequence===request.current){setAuthFailed(true);setApplications([]);setProgressReady(false);setReadError('目前無法確認登入與會員申請，請重新讀取。');}}
    finally{if(sequence===request.current)setLoading(false);}
  },[]);
  useEffect(()=>{void load();return()=>{request.current++;};},[load]);
  useEffect(()=>{
    let active=true;setSource(null);setJoinTeam(false);setSourceFailed(false);
    if(!sourceText.trim()||!signedIn){setSourceLoading(false);return;}
    setSourceLoading(true);
    const timer=setTimeout(async()=>{
      try{const {data,error:e}=await getSupabaseBrowserClient().rpc('membership_source_preview',{p_text:sourceText});if(e)throw e;if(active)setSource(data as unknown as MembershipSource);}
      catch{if(active)setSourceFailed(true);}finally{if(active)setSourceLoading(false);}
    },350);
    return()=>{active=false;clearTimeout(timer);};
  },[sourceText,signedIn]);
  const team=source?.team_id||'';
  const sourceMessage=sourceLoading?'正在比對介紹人或企業…':sourceFailed?'暫時無法比對，小隊會交由協會核對。':source?.status==='matched'?'已自動帶入對應小隊。':source?.status==='ambiguous'?'找到多筆同名介紹人或企業，待協會核對小隊。':source?.status==='team_ambiguous'?'此介紹來源對應多個小隊，待協會核對。':source?.status==='no_team'?'已找到介紹來源，目前尚無對應小隊。':sourceText.trim()?'尚未找到對應資料，將保留填寫內容供協會核對。':'請先填寫介紹人姓名或所屬企業。';
  const pending=applications.some(a=>a.status==='pending');
  async function submit(event:FormEvent){event.preventDefault();if(submitting.current||busy||loading||!signedIn||!ready||pending||sourceLoading||!consent)return;submitting.current=true;setBusy(true);setError('');setNotice('');
    try{const {error:e}=await getHistoryClient().rpc('membership_submit_with_birthday',{p_kind:kind,p_type:type,p_name:name,p_identity:identity,p_phone:phone,p_email:email,p_address:address,p_source_text:sourceText,p_join_team:joinTeam,p_consent:consent,p_birth_date:birthDate,p_greetings:greetings});if(e)throw e;setIdentity('');setConsent(false);edited.current=false;setNotice('申請已送出。審核結果會顯示在「申請進度」；核准前不會啟用會籍或變更小隊。');await load();}catch(e){setError(membershipError(e));}finally{submitting.current=false;setBusy(false);}}
  return <div className="membershipWorkspace membershipApplicationWorkspace" aria-busy={loading||busy}>
    {loading?<p role="status">正在讀取會員申請…</p>:<>
      {readError&&<div className="workflowNotice" role="alert">{readError}</div>}
      {error&&<div className="workflowNotice" role="alert">{error}</div>}
      {notice&&<p className="workflowNotice" role="status">{notice}</p>}
      {!authFailed&&!signedIn&&<div className="privacyCallout"><h2>先登入你的網站帳號</h2><p>登入後才能送出自己的會員申請及查看審核進度。</p><Link className="primaryFlow" href="/login?next=%2Fmembership%2Fapply">前往登入</Link></div>}
    </>}
    <button type="button" className="applicationRefresh" disabled={loading||busy} onClick={()=>{setError('');setNotice('');void load();}}>重新讀取申請進度</button>
    {!loading&&signedIn&&!authFailed&&progressReady&&<section aria-labelledby="membership-history"><h2 id="membership-history">申請進度</h2>{applications.length?applications.map(a=><article className="membershipCard" key={a.id}><div className="membershipCardHead"><h3>{a.application_kind==='new'?'新會員加入':'舊會員續會'} · {a.membership_type==='annual'?'一般會員':'永久會員'}</h3><strong>{membershipStatus[a.status]}</strong></div><p>{a.full_name} · {a.identity_mask}</p>{a.referrer_text&&<p>介紹人或所屬企業：{a.referrer_text}</p>}<p>送出時間：{new Date(a.created_at).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})}</p>{a.review_note&&<p>審核備註：{a.review_note}</p>}</article>):<p>目前沒有申請紀錄。</p>}</section>}
    {!loading&&ready&&<form className="membershipForm" aria-label="入會與續會申請" onChange={()=>{edited.current=true;}} onSubmit={submit}>
      <h2>2027年年度會員｜入會／續會申請</h2><p>＊ 為必填。身分證只用於會員身分核對，以加密方式保存；此處與管理審核畫面只顯示遮罩。</p>
      {pending&&<p className="privacyCallout">已有待審核申請，請等待協會處理。</p>}
      <fieldset disabled={busy||pending}><legend>申請資料</legend><div className="membershipFields">
        <label>申請類型＊<select value={kind} onChange={e=>setKind(e.target.value as typeof kind)}><option value="new">新會員加入</option><option value="renewal">舊會員續會</option></select></label>
        <label>申請會籍＊<select value={type} onChange={e=>setType(e.target.value as typeof type)}><option value="annual">一般會員</option><option value="lifetime">永久會員</option></select></label>
        <label>姓名＊<input required maxLength={100} autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></label>
        <label>生日＊<input aria-label="生日＊" aria-describedby="membership-birthday-help" required type="date" autoComplete="bday" min="1900-01-01" max={taiwanDate()} value={birthDate} onChange={e=>setBirthDate(e.target.value)}/><small id="membership-birthday-help">用於會員資料與生日祝賀，不列入會員名冊。</small></label>
        <label>身分證字號＊<input required type="password" aria-label="身分證字號＊" minLength={10} maxLength={10} autoComplete="off" value={identity} onChange={e=>setIdentity(e.target.value.toUpperCase())}/><small>目前接受台灣國民身分證。其他證件請聯絡協會，勿填入假資料。格式檢查不代表身分已驗證。</small></label>
        <label>聯絡電話＊<input required type="tel" minLength={6} maxLength={30} autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)}/></label>
        <label>信箱＊<input required type="email" maxLength={254} autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
        <label className="membershipWide">通訊地址＊<input required minLength={3} maxLength={500} autoComplete="street-address" value={address} onChange={e=>setAddress(e.target.value)}/></label>
        <label>介紹人或所屬企業<input aria-label="介紹人或所屬企業" maxLength={200} autoComplete="off" placeholder="請自行輸入介紹人姓名或企業名稱" value={sourceText} onChange={e=>{setSourceText(e.target.value);setSource(null);setJoinTeam(false);}}/></label>
        <label>介紹人小隊<input aria-label="介紹人小隊" readOnly value={source?.team_name||''} placeholder="依介紹人或企業自動帶入"/><small role="status">{sourceMessage}</small></label>
      </div>
      <label className="membershipCheck"><input type="checkbox" checked={greetings} onChange={e=>setGreetings(e.target.checked)}/>我願意讓協會使用生日資料安排生日祝賀（可隨時取消）。</label>
      {team&&<label className="membershipCheck"><input type="checkbox" checked={joinTeam} onChange={e=>setJoinTeam(e.target.checked)}/>我同意核准後加入自動帶入的小隊。已有其他小隊時，由協會先核對，不會直接更換。</label>}
      <label className="membershipCheck"><input required type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>我同意協會為會員資格審核、會籍管理與必要聯繫使用上述資料，並了解姓名、會籍、入會日期、介紹人將列入限有效會員查看的名冊。聯絡方式與身分證不列入名冊。<Link href="/privacy">隱私說明</Link></label>
      <div className="privacyCallout membershipFees"><h3>會員費用說明</h3><ul><li>入會費 0 元</li><li>永久會員費一次性繳交 10,000 元（會員禮及會員權益可享 10 年）</li><li>一般會員費每年 1,200 元</li></ul></div><p>送出申請不表示已繳費或取得會籍。</p><button className="primaryFlow" disabled={busy||pending||sourceLoading}>{busy?'正在送出…':'送出申請'}</button></fieldset>
    </form>}

    <nav className="applicationRoutes" aria-label="會員申請後續操作"><Link href="/account/profile">查看會籍、年資與生日資料 →</Link><Link href="/account/identity">身份與使用權限 →</Link><Link href="/account/notifications">查看審核與進度通知 →</Link>
    <p><Link href="/membership/claim">已有歷年會籍？先認領原有資料 →</Link></p>
    <Link href="/membership/directory">查看年度會員名冊 →</Link></nav>
  </div>;
}
