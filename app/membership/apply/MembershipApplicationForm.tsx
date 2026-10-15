'use client';
import Link from 'next/link';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {getMembershipClient as getSupabaseBrowserClient} from '../../../lib/membership-api';
import {membershipError,membershipStatus,type MembershipApplication,type Referrer} from '../../../lib/membership';

export default function MembershipApplicationForm(){
  const [loading,setLoading]=useState(true),[signedIn,setSignedIn]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [applications,setApplications]=useState<MembershipApplication[]>([]),[referrers,setReferrers]=useState<Referrer[]>([]);
  const [kind,setKind]=useState<'new'|'renewal'>('new'),[type,setType]=useState<'annual'|'lifetime'>('annual');
  const [name,setName]=useState(''),[identity,setIdentity]=useState(''),[phone,setPhone]=useState(''),[email,setEmail]=useState(''),[address,setAddress]=useState('');
  const [referrer,setReferrer]=useState(''),[team,setTeam]=useState(''),[joinTeam,setJoinTeam]=useState(false),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false);
  const submitting=useRef(false);
  async function load(){
    setError('');setLoading(true);
    try{
      const s=getSupabaseBrowserClient();const {data,error:authError}=await s.auth.getUser();if(authError||!data.user){setSignedIn(false);return;}setSignedIn(true);
      const [a,r,m]=await Promise.all([s.rpc('membership_applications_self'),s.rpc('membership_referrers'),s.from('memberships').select('membership_type').eq('user_id',data.user.id).maybeSingle()]);
      if(a.error)throw a.error;if(r.error)throw r.error;if(m.error)throw m.error;
      const rows=(a.data||[]) as unknown as MembershipApplication[];setApplications(rows);setReferrers((r.data||[]) as unknown as Referrer[]);setReady(true);
      if(rows[0]){const latest=rows[0];setName(latest.full_name);setPhone(latest.phone);setEmail(latest.email);setAddress(latest.address);setKind(latest.application_kind);setType(latest.membership_type);}
      else{setEmail(data.user.email||'');if(m.data){setKind('renewal');if(m.data.membership_type==='annual'||m.data.membership_type==='lifetime')setType(m.data.membership_type);}}
    }catch(e){setError(membershipError(e));}finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[]);
  function chooseReferrer(id:string){setReferrer(id);const teams=referrers.find(r=>r.id===id)?.teams||[];setTeam(teams.length===1?teams[0].id:'');setJoinTeam(false);}
  const teams=referrers.find(r=>r.id===referrer)?.teams||[];
  const pending=applications.some(a=>a.status==='pending');
  async function submit(event:FormEvent){event.preventDefault();if(submitting.current)return;submitting.current=true;setBusy(true);setError('');setNotice('');
    try{const {error:e}=await getSupabaseBrowserClient().rpc('membership_submit',{p_kind:kind,p_type:type,p_name:name,p_identity:identity,p_phone:phone,p_email:email,p_address:address,p_referrer:referrer||null,p_team:team||null,p_join_team:joinTeam,p_consent:consent});if(e)throw e;setIdentity('');setConsent(false);setNotice('申請已送出。審核結果會顯示在下方；核准前不會啟用會籍或變更小隊。');await load();}catch(e){setError(membershipError(e));}finally{submitting.current=false;setBusy(false);}}
  if(loading)return <p role="status">正在讀取會員申請…</p>;
  if(!signedIn)return <div className="privacyCallout"><h2>先登入你的網站帳號</h2><p>登入後才能送出自己的會員申請及查看審核進度。</p><Link className="primaryFlow" href="/login?next=%2Fmembership%2Fapply">前往登入</Link></div>;
  return <div className="membershipWorkspace">
    {error&&<div className="workflowNotice" role="alert">{error}<button type="button" onClick={()=>void load()}>重新讀取</button></div>}
    {notice&&<p className="workflowNotice" role="status">{notice}</p>}
    {ready&&<form className="membershipForm" onSubmit={submit}>
      <h2>入會／續會申請</h2><p>＊ 為必填。身分證只用於會員身分核對，以加密方式保存；此處與管理審核畫面只顯示遮罩。</p>
      {pending&&<p className="privacyCallout">已有待審核申請，請等待協會處理。</p>}
      <fieldset disabled={busy||pending}><legend>申請資料</legend><div className="membershipFields">
        <label>申請類型＊<select value={kind} onChange={e=>setKind(e.target.value as typeof kind)}><option value="new">新會員加入</option><option value="renewal">舊會員續會</option></select></label>
        <label>申請會籍＊<select value={type} onChange={e=>setType(e.target.value as typeof type)}><option value="annual">一般會員</option><option value="lifetime">永久會員</option></select></label>
        <label>姓名＊<input required maxLength={100} autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></label>
        <label>身分證字號＊<input required type="password" minLength={10} maxLength={10} autoComplete="off" value={identity} onChange={e=>setIdentity(e.target.value.toUpperCase())}/><small>目前接受台灣國民身分證。其他證件請聯絡協會，勿填入假資料。格式檢查不代表身分已驗證。</small></label>
        <label>聯絡電話＊<input required type="tel" minLength={6} maxLength={30} autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)}/></label>
        <label>信箱＊<input required type="email" maxLength={254} autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
        <label className="membershipWide">通訊地址＊<input required minLength={3} maxLength={500} autoComplete="street-address" value={address} onChange={e=>setAddress(e.target.value)}/></label>
        <label>介紹人<select value={referrer} onChange={e=>chooseReferrer(e.target.value)}><option value="">無介紹人／由協會另行核對</option>{referrers.map(r=><option key={r.id} value={r.id}>{r.name}（{r.teams.map(t=>t.name).join('、')||'尚無小隊'}）</option>)}</select></label>
        <label>介紹人所屬小隊<select value={team} disabled={!teams.length} onChange={e=>{setTeam(e.target.value);setJoinTeam(false);}}><option value="">{teams.length>1?'有多個小隊，請選擇':'無小隊／暫不加入'}</option>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
      </div>
      {team&&<label className="membershipCheck"><input type="checkbox" checked={joinTeam} onChange={e=>setJoinTeam(e.target.checked)}/>我同意核准後加入所選小隊。已有其他小隊時，由協會先核對，不會直接更換。</label>}
      <label className="membershipCheck"><input required type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>我同意協會為會員資格審核、會籍管理與必要聯繫使用上述資料，並了解姓名、會籍、入會日期、介紹人將列入限有效會員查看的名冊。聯絡方式與身分證不列入名冊。<Link href="/privacy">隱私說明</Link></label>
      <p>會費與永久會員認定依協會既有程序。送出申請不表示已繳費或取得會籍。</p><button className="primaryFlow" disabled={busy||pending}>{busy?'正在送出…':'送出申請'}</button></fieldset>
    </form>}
    <section aria-labelledby="membership-history"><h2 id="membership-history">申請進度</h2>{applications.length?applications.map(a=><article className="membershipCard" key={a.id}><div className="membershipCardHead"><h3>{a.application_kind==='new'?'新會員加入':'舊會員續會'} · {a.membership_type==='annual'?'一般會員':'永久會員'}</h3><strong>{membershipStatus[a.status]}</strong></div><p>{a.full_name} · {a.identity_mask}</p><p>送出時間：{new Date(a.created_at).toLocaleString('zh-TW',{timeZone:'Asia/Taipei'})}</p>{a.review_note&&<p>審核備註：{a.review_note}</p>}</article>):<p>目前沒有申請紀錄。</p>}</section>
    <Link href="/membership/directory">查看年度會員名冊 →</Link>
  </div>;
}
