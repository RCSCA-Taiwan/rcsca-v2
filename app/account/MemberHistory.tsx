 'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {getHistoryClient,historyError,type MemberHistory} from '../../lib/member-history';
import {taiwanDate} from '../../lib/membership';
import {membershipTenure} from '../../lib/membership-tenure.mjs';
export default function MemberHistoryPanel(){
 const [data,setData]=useState<MemberHistory|null>(null),[birthday,setBirthday]=useState(''),[greetings,setGreetings]=useState(false),[state,setState]=useState<'loading'|'guest'|'ready'|'error'>('loading'),[message,setMessage]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);const saving=useRef(false),edited=useRef(false),request=useRef(0),owner=useRef<string|null>(null);
 const load=useCallback(async()=>{
  const sequence=++request.current;setState('loading');
  try{
   const s=getHistoryClient();const {data:{user},error:authError}=await s.auth.getUser();if(authError)throw authError;
   if(sequence!==request.current)return;
   if(!user){owner.current=null;edited.current=false;setData(null);setBirthday('');setGreetings(false);setState('guest');return;}
   if(owner.current!==user.id){owner.current=user.id;edited.current=false;}
   const {data,error}=await s.rpc('member_history_self');if(error)throw error;
   if(sequence!==request.current)return;
   const h=data as unknown as MemberHistory;
   if(!h||typeof h!=='object'||!(h.birth_date===null||typeof h.birth_date==='string')||typeof h.greetings_consent!=='boolean'||!(h.member_since===null||typeof h.member_since==='string')||!(h.membership_type===null||h.membership_type==='annual'||h.membership_type==='lifetime')||!(h.claim===null||h.claim&&['pending','approved','rejected'].includes(h.claim.status)))throw new Error('history_unavailable');
   setData(h);if(!edited.current){setBirthday(h.birth_date||'');setGreetings(h.greetings_consent);}setState('ready');
  }catch{if(sequence===request.current)setState('error');}
 },[]);
 useEffect(()=>{void load();return()=>{request.current++;};},[load]);
 async function save(e:FormEvent){e.preventDefault();if(saving.current||busy||state!=='ready')return;saving.current=true;setBusy(true);setMessage('');setError('');
  try{
   const s=getHistoryClient();const {data:{user},error:authError}=await s.auth.getUser();if(authError||!user||user.id!==owner.current)throw new Error('authentication_required');
   const {error}=await s.rpc('member_birthday_save',{p_birth_date:birthday||null,p_greetings:!!birthday&&greetings});if(error)throw error;
   edited.current=false;setMessage('生日資料已儲存。');await load();
  }catch(e){setError(historyError(e));}finally{saving.current=false;setBusy(false);}}
 const tenure=membershipTenure(data?.member_since??null);
 return <section className="membershipWorkspace memberHistory" aria-label="會籍與生日資料" aria-busy={state==='loading'||busy}><h2>我的會籍與生日</h2>{state==='loading'?<p role="status">正在讀取會籍資料…</p>:state==='error'?<div role="alert">目前無法確認會籍與生日資料，請重新讀取後再修改。</div>:state==='guest'?<p><Link href="/login?next=%2Faccount%2Fprofile">登入後查看會籍與生日資料 →</Link></p>:<>
 <div className="membershipCard"><p>會員身分：{data?.membership_type==='lifetime'?'永久會員':data?.membership_type==='annual'?'一般會員':'尚未連結會籍'}{data?.membership_type&&`（${data.membership_status==='active'?'有效':'目前非有效會籍'}）`}</p><p>原始入會日期：{data?.member_since||'待協會核對'}</p><p>累積會籍年資：{tenure?`已滿 ${tenure.years} 年`:'待確認原始入會日期'}</p><small>年資依原始入會日期計算；續會不重設日期。年資不代表目前年度資格。</small><p><Link href="/membership/claim">認領歷年會員資料 →</Link></p>{data?.claim&&<p>認領進度：{data.claim.status==='pending'?'待協會核對':data.claim.status==='approved'?'已核准':'未通過'}{data.claim.review_note&&`；${data.claim.review_note}`}</p>}</div>
 <form className="authForm" aria-label="生日資料" onChange={()=>{edited.current=true;}} onSubmit={save}><fieldset disabled={busy}><legend>生日資料</legend><label>生日<input type="date" autoComplete="bday" min="1900-01-01" max={taiwanDate()} value={birthday} onChange={e=>{setBirthday(e.target.value);if(!e.target.value)setGreetings(false);}}/></label><p>生日僅供本人與會員管理作業使用，不出現在會員名冊或公開個人頁面。</p><label className="membershipCheck"><input type="checkbox" checked={greetings} disabled={!birthday} onChange={e=>setGreetings(e.target.checked)}/>我願意讓協會使用生日資料安排生日祝賀。</label><small>可隨時取消祝賀意願，或清除生日後儲存。舊名冊匯入的生日不會自動勾選同意。</small><p><button disabled={busy}>{busy?'儲存中…':'儲存生日資料'}</button></p></fieldset></form></>}{error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}<button type="button" className="profileRefresh" disabled={state==='loading'||busy} onClick={()=>{setMessage('');setError('');void load();}}>重新讀取會籍與生日</button></section>;
}
