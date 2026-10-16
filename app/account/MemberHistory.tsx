 'use client';
import Link from 'next/link';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {getHistoryClient,historyError,type MemberHistory} from '../../lib/member-history';
import {taiwanDate} from '../../lib/membership';
export default function MemberHistoryPanel(){
 const [data,setData]=useState<MemberHistory|null>(null),[birthday,setBirthday]=useState(''),[greetings,setGreetings]=useState(false),[state,setState]=useState<'loading'|'guest'|'ready'|'error'>('loading'),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);const saving=useRef(false);
 async function load(){setState('loading');try{const s=getHistoryClient();const {data:{user}}=await s.auth.getUser();if(!user){setState('guest');return;}const {data,error}=await s.rpc('member_history_self');if(error)throw error;const h=data as unknown as MemberHistory;setData(h);setBirthday(h.birth_date||'');setGreetings(h.greetings_consent);setState('ready');}catch{setState('error');}}
 useEffect(()=>{void load();},[]);
 async function save(e:FormEvent){e.preventDefault();if(saving.current)return;saving.current=true;setBusy(true);setMessage('');try{const {error}=await getHistoryClient().rpc('member_birthday_save',{p_birth_date:birthday||null,p_greetings:greetings});if(error)throw error;setMessage('生日資料已儲存。');await load();}catch(e){setMessage(historyError(e));}finally{saving.current=false;setBusy(false);}}
 if(state==='guest')return null;
 return <section className="membershipWorkspace" aria-label="會籍與生日資料"><h2>我的會籍與生日</h2>{state==='loading'?<p role="status">正在讀取會籍資料…</p>:state==='error'?<div role="alert">目前無法確認會籍與生日資料。<button onClick={()=>void load()}>重新讀取</button></div>:<>
 <div className="membershipCard"><p>會員身分：{data?.membership_type==='lifetime'?'永久會員':data?.membership_type==='annual'?'一般會員':'尚未連結會籍'}{data?.membership_type&&`（${data.membership_status==='active'?'有效':'目前非有效會籍'}）`}</p><p>原始入會日期：{data?.member_since||'待協會核對'}</p><p>累積會籍年資：{data?.years!=null?`已滿 ${data.years} 年`:'待確認原始入會日期'}</p><small>年資依原始入會日期計算；續會不重設日期。年資不代表目前年度資格。</small><p><Link href="/membership/claim">認領歷年會員資料 →</Link></p>{data?.claim&&<p>認領進度：{data.claim.status==='pending'?'待協會核對':data.claim.status==='approved'?'已核准':'未通過'}{data.claim.review_note&&`；${data.claim.review_note}`}</p>}</div>
 <form className="authForm" onSubmit={save}><fieldset disabled={busy}><legend>生日資料</legend><label>生日<input type="date" autoComplete="bday" min="1900-01-01" max={taiwanDate()} value={birthday} onChange={e=>{setBirthday(e.target.value);if(!e.target.value)setGreetings(false);}}/></label><p>生日僅供本人與會員管理作業使用，不出現在會員名冊或公開個人頁面。</p><label className="membershipCheck"><input type="checkbox" checked={greetings} disabled={!birthday} onChange={e=>setGreetings(e.target.checked)}/>我願意讓協會使用生日資料安排生日祝賀。</label><small>可隨時取消祝賀意願，或清除生日後儲存。舊名冊匯入的生日不會自動勾選同意。</small><p><button disabled={busy}>{busy?'儲存中…':'儲存生日資料'}</button></p></fieldset></form></>}{message&&<p role="status">{message}</p>}</section>;
}
