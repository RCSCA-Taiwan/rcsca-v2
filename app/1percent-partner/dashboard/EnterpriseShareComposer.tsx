'use client';
import {useState} from 'react';
import {getSupabaseBrowserClient} from '../../../lib/supabase-browser';

const shareTypes=[
  ['care','公益關懷'],['connection','資源連結'],['benefit','會員禮遇'],['job','工作機會'],['professional','專業共享'],['resource','資源共享']
] as const;

export default function EnterpriseShareComposer({enterpriseId,onSaved}:{enterpriseId:string;onSaved?:()=>void}){
 const [type,setType]=useState('professional'),[title,setTitle]=useState(''),[description,setDescription]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 async function submit(){
  if(!title.trim()){setNotice('請先填寫共享內容名稱。');return;}
  setBusy(true);setNotice('');
  const s=getSupabaseBrowserClient();
  const {error}=await s.from('enterprise_shares').insert({enterprise_id:enterpriseId,share_type:type,title:title.trim(),description:description.trim()||null,status:'submitted',public_result:false});
  if(error){setNotice('送出失敗，請稍後再試或確認企業帳號權限。');setBusy(false);return;}
  setTitle('');setDescription('');setNotice('已送出給 RCSCA 審核；核准前不會公開。');setBusy(false);onSaved?.();
 }
 return <section className="partnerComposer">
   <div className="sectionHead compact"><div><div className="eyebrow">新增企業共享</div><h2>企業可以提出，不能自己核准。</h2></div><p>填寫你願意提供的 1%。送出後先進入審核，不會立即公開。</p></div>
   <div className="partnerComposerGrid">
    <label>共享類型<select value={type} onChange={e=>setType(e.target.value)}>{shareTypes.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
    <label>內容名稱<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="例如：每月提供 10 個會員專屬名額"/></label>
    <label className="wide">補充說明<textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="說明適用對象、範圍、限制或可提供的方式"/></label>
   </div>
   <div className="composerActions"><button onClick={submit} disabled={busy}>{busy?'送出中…':'送出審核'}</button><span>{notice}</span></div>
  </section>
}
