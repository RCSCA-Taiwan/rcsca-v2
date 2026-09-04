'use client';
import {useState} from 'react';
import {getSupabaseBrowserClient} from '../../../lib/supabase-browser';
import {Locale,useI18n} from '../../i18n';

const copy:Record<Locale,any>={
 'zh-Hant':{types:{care:'公益關懷',connection:'資源連結',benefit:'會員禮遇',job:'工作機會',professional:'專業共享',resource:'資源共享'},required:'請先填寫共享內容名稱。',failed:'送出失敗，請稍後再試或確認企業帳號權限。',sent:'已送出給 RCSCA 審核；核准前不會公開。',eye:'新增企業共享',title:'企業可以提出，不能自己核准。',lead:'填寫你願意提供的 1%。送出後先進入審核，不會立即公開。',type:'共享類型',name:'內容名稱',namePlaceholder:'例如：每月提供 10 個會員專屬名額',description:'補充說明',descriptionPlaceholder:'說明適用對象、範圍、限制或可提供的方式',sending:'送出中…',submit:'送出審核'},
 'en':{types:{care:'Community care',connection:'Resource connection',benefit:'Member benefit',job:'Job opportunity',professional:'Professional sharing',resource:'Resource sharing'},required:'Enter a name for this sharing item.',failed:'Submission failed. Try again later or check enterprise account permissions.',sent:'Submitted for RCSCA review. It will not be public before approval.',eye:'Add enterprise sharing',title:'Enterprises may propose; they cannot self-approve.',lead:'Describe the 1% you are willing to offer. It enters review first and is not published immediately.',type:'Sharing type',name:'Content name',namePlaceholder:'Example: 10 member-only places each month',description:'Additional details',descriptionPlaceholder:'Explain eligibility, scope, limits, or how it can be provided',sending:'Submitting…',submit:'Submit for review'},
 'ja':{types:{care:'公益ケア',connection:'資源連携',benefit:'会員特典',job:'仕事の機会',professional:'専門性の共有',resource:'資源共有'},required:'共有内容の名称を入力してください。',failed:'送信できません。後ほど再試行するか、企業アカウントの権限を確認してください。',sent:'RCSCAの審査へ送信しました。承認前は公開されません。',eye:'企業共有を追加',title:'企業は提案できますが、自ら承認はできません。',lead:'提供できる1%を入力してください。送信後は審査に入り、すぐには公開されません。',type:'共有の種類',name:'内容名',namePlaceholder:'例：毎月、会員限定10枠を提供',description:'補足説明',descriptionPlaceholder:'対象、範囲、制限、提供方法を説明',sending:'送信中…',submit:'審査へ送信'},
 'ko':{types:{care:'공익 돌봄',connection:'자원 연결',benefit:'회원 혜택',job:'일자리',professional:'전문성 공유',resource:'자원 공유'},required:'공유 콘텐츠 이름을 입력해 주세요.',failed:'제출하지 못했습니다. 잠시 후 다시 시도하거나 기업 계정 권한을 확인해 주세요.',sent:'RCSCA 검토를 위해 제출했습니다. 승인 전에는 공개되지 않습니다.',eye:'기업 공유 추가',title:'기업은 제안할 수 있지만 직접 승인할 수 없습니다.',lead:'제공할 수 있는 1%를 입력하세요. 제출 후 먼저 검토되며 즉시 공개되지 않습니다.',type:'공유 유형',name:'콘텐츠 이름',namePlaceholder:'예: 매월 회원 전용 10자리 제공',description:'추가 설명',descriptionPlaceholder:'대상, 범위, 제한 또는 제공 방법을 설명',sending:'제출 중…',submit:'검토 제출'}
};
const shareTypeKeys=['care','connection','benefit','job','professional','resource'] as const;

export default function EnterpriseShareComposer({enterpriseId,onSaved}:{enterpriseId:string;onSaved?:()=>void}){
 const {locale}=useI18n();const c=copy[locale];
 const [type,setType]=useState('professional'),[title,setTitle]=useState(''),[description,setDescription]=useState(''),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
 async function submit(){
  if(!title.trim()){setNotice(c.required);return;}
  setBusy(true);setNotice('');
  const s=getSupabaseBrowserClient();
  const {error}=await s.rpc('enterprise_submit_share',{p_share_type:type,p_title:title,p_description:description});
  if(error){setNotice(c.failed);setBusy(false);return;}
  setTitle('');setDescription('');setNotice(c.sent);setBusy(false);onSaved?.();
 }
 return <section className="partnerComposer">
   <div className="sectionHead compact"><div><div className="eyebrow">{c.eye}</div><h2>{c.title}</h2></div><p>{c.lead}</p></div>
   <div className="partnerComposerGrid">
    <label>{c.type}<select value={type} onChange={e=>setType(e.target.value)}>{shareTypeKeys.map(v=><option key={v} value={v}>{c.types[v]}</option>)}</select></label>
    <label>{c.name}<input value={title} onChange={e=>setTitle(e.target.value)} placeholder={c.namePlaceholder}/></label>
    <label className="wide">{c.description}<textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder={c.descriptionPlaceholder}/></label>
   </div>
   <div className="composerActions"><button onClick={submit} disabled={busy}>{busy?c.sending:c.submit}</button><span>{notice}</span></div>
  </section>
}
