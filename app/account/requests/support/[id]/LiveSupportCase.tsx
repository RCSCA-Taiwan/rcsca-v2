'use client';
import {useCallback,useEffect,useRef,useState} from 'react';import Link from 'next/link';import './case-detail.css';import {getSupabaseBrowserClient} from '../../../../../lib/supabase-browser';import {Locale,useI18n} from '../../../../i18n';
const copy:Record<Locale,any>={
 'zh-Hant':{signin:'請先登入。',notFound:'找不到案件，或你沒有查看權限。',sendFail:'目前無法送出，請稍後再試。',sent:'補充資料已送出。',loading:'正在讀取案件…',unavailable:'無法讀取案件',private:'需求案件只開放本人與具個案權限的承辦查看。',back:'回到我的進度 →',kind:'關懷需求',updated:'更新 ',timeline:'案件時間軸',building:'案件歷程建立中。',needPlaceholder:'補上 RCSCA 請你提供的資料',replyPlaceholder:'補充目前狀況或回覆 RCSCA',submit:'送出補充／回覆',backBottom:'← 回到我的進度',labels:{submitted:'已送出',under_review:'評估中',needs_info:'需要補充',approved:'已核准',matched:'資源媒合中',completed:'已完成',rejected:'未承接',cancelled:'已取消'},events:{created:'建立需求',status_changed:'進度更新',needs_info:'需要補充資料',owner_reply:'我的補充／回覆',completed:'案件完成',rejected:'案件結果',fallback:'案件更新'}},
 en:{signin:'Please sign in.',notFound:'The case could not be found, or you do not have permission to view it.',sendFail:'The reply cannot be submitted right now. Please try again later.',sent:'Additional information submitted.',loading:'Loading case…',unavailable:'Unable to load case',private:'Request cases are visible only to the owner and authorized case staff.',back:'Back to my progress →',kind:'Care request',updated:'Updated ',timeline:'Case timeline',building:'The case history is being prepared.',needPlaceholder:'Add the information requested by RCSCA',replyPlaceholder:'Add an update or reply to RCSCA',submit:'Submit update / reply',backBottom:'← Back to my progress',labels:{submitted:'Submitted',under_review:'Under review',needs_info:'More information needed',approved:'Approved',matched:'Resource matching',completed:'Completed',rejected:'Not accepted',cancelled:'Cancelled'},events:{created:'Request created',status_changed:'Progress updated',needs_info:'More information requested',owner_reply:'My update / reply',completed:'Case completed',rejected:'Case outcome',fallback:'Case updated'}},
 ja:{signin:'ログインしてください。',notFound:'案件が見つからないか、閲覧権限がありません。',sendFail:'現在送信できません。後ほど再度お試しください。',sent:'追加情報を送信しました。',loading:'案件を読み込み中…',unavailable:'案件を読み込めません',private:'依頼案件を確認できるのは本人と権限を持つ担当者だけです。',back:'自分の進捗へ戻る →',kind:'ケアの依頼',updated:'更新 ',timeline:'案件のタイムライン',building:'案件履歴を作成中です。',needPlaceholder:'RCSCAから依頼された情報を追加',replyPlaceholder:'現在の状況を追加、またはRCSCAへ返信',submit:'追加情報／返信を送信',backBottom:'← 自分の進捗へ戻る',labels:{submitted:'提出済み',under_review:'審査中',needs_info:'情報の追加が必要',approved:'承認済み',matched:'資源マッチング中',completed:'完了',rejected:'受付不可',cancelled:'キャンセル済み'},events:{created:'依頼を作成',status_changed:'進捗を更新',needs_info:'情報の追加が必要',owner_reply:'自分の追加情報／返信',completed:'案件完了',rejected:'案件結果',fallback:'案件更新'}},
 ko:{signin:'로그인이 필요합니다.',notFound:'사례를 찾을 수 없거나 조회 권한이 없습니다.',sendFail:'현재 제출할 수 없습니다. 잠시 후 다시 시도해 주세요.',sent:'추가 정보를 제출했습니다.',loading:'사례를 불러오는 중…',unavailable:'사례를 불러올 수 없습니다',private:'요청 사례는 본인과 권한이 있는 담당자만 확인할 수 있습니다.',back:'나의 진행으로 →',kind:'돌봄 요청',updated:'업데이트 ',timeline:'사례 타임라인',building:'사례 이력을 준비 중입니다.',needPlaceholder:'RCSCA에서 요청한 정보를 추가하세요',replyPlaceholder:'현재 상황을 추가하거나 RCSCA에 답변하세요',submit:'추가 정보／답변 제출',backBottom:'← 나의 진행으로',labels:{submitted:'제출됨',under_review:'검토 중',needs_info:'추가 정보 필요',approved:'승인됨',matched:'자원 매칭 중',completed:'완료',rejected:'접수되지 않음',cancelled:'취소됨'},events:{created:'요청 생성',status_changed:'진행 업데이트',needs_info:'추가 정보 요청',owner_reply:'나의 추가 정보／답변',completed:'사례 완료',rejected:'사례 결과',fallback:'사례 업데이트'}}
};
const dateLocale:Record<Locale,string>={'zh-Hant':'zh-TW',en:'en-US',ja:'ja-JP',ko:'ko-KR'};
type CaseRow={id:string;title:string;public_summary:string|null;status:string;created_at:string;updated_at:string};
type CaseEvent={id:string;case_id:string;event_type:string;status:string|null;note:string|null;created_at:string};
const recovery:Record<Locale,{retry:string;caseFailed:string;historyFailed:string;reply:string;busy:string;closed:string;sendFailed:string;notifications:string;newRequest:string;login:string}>={
 'zh-Hant':{retry:'重新讀取案件與歷程',caseFailed:'目前無法讀取案件，請重新讀取。',historyFailed:'目前無法確認案件歷程，請重新讀取；這不代表沒有紀錄。',reply:'補充資料／回覆',busy:'正在送出…',closed:'案件已結束，目前不能再補充或回覆。',sendFailed:'未能確認送出結果。請重新讀取案件歷程後，再決定是否重試。',notifications:'我的通知 →',newRequest:'提出新需求 →',login:'前往登入 →'},
 en:{retry:'Reload case and history',caseFailed:'The case could not be loaded. Please retry.',historyFailed:'Case history could not be confirmed. Please reload; this does not mean there are no records.',reply:'Additional information / reply',busy:'Sending…',closed:'This case is closed and no longer accepts replies.',sendFailed:'The submission result could not be confirmed. Reload the history before deciding whether to retry.',notifications:'My notifications →',newRequest:'Submit a new request →',login:'Go to sign in →'},
 ja:{retry:'案件と履歴を再読み込み',caseFailed:'案件を読み込めません。再試行してください。',historyFailed:'案件履歴を確認できません。記録がないことを意味しません。再読み込みしてください。',reply:'追加情報／返信',busy:'送信中…',closed:'案件は終了しており、追加情報や返信を送信できません。',sendFailed:'送信結果を確認できません。履歴を再読み込みしてから再試行を判断してください。',notifications:'自分の通知 →',newRequest:'新しい依頼を提出 →',login:'ログインへ →'},
 ko:{retry:'사례와 이력 다시 불러오기',caseFailed:'사례를 불러오지 못했습니다. 다시 시도해 주세요.',historyFailed:'사례 이력을 확인하지 못했습니다. 기록이 없다는 뜻이 아닙니다. 다시 불러오세요.',reply:'추가 정보／답변',busy:'제출 중…',closed:'종료된 사례에는 추가 정보나 답변을 제출할 수 없습니다.',sendFailed:'제출 결과를 확인하지 못했습니다. 이력을 다시 불러온 후 재시도 여부를 결정해 주세요.',notifications:'내 알림 →',newRequest:'새 요청 제출 →',login:'로그인으로 →'}
};
function caseRow(value:unknown,id:string):value is CaseRow{const r=value as CaseRow;return !!r&&r.id===id&&typeof r.title==='string'&&typeof r.status==='string'&&typeof r.created_at==='string'&&typeof r.updated_at==='string'&&(r.public_summary===null||typeof r.public_summary==='string');}
function caseEvents(value:unknown,id:string):value is CaseEvent[]{return Array.isArray(value)&&value.every((r:CaseEvent)=>!!r&&typeof r.id==='string'&&r.case_id===id&&typeof r.event_type==='string'&&typeof r.created_at==='string'&&(r.status===null||typeof r.status==='string')&&(r.note===null||typeof r.note==='string'));}
export default function LiveSupportCase({id}:{id:string}){
 const {locale}=useI18n();const c=copy[locale],message=recovery[locale];
 const [loading,setLoading]=useState(true),[row,setRow]=useState<CaseRow|null>(null),[events,setEvents]=useState<CaseEvent[]|null>(null),[userId,setUserId]=useState<string|null>(null),[failed,setFailed]=useState(false);
 const [reply,setReply]=useState(''),[notice,setNotice]=useState(false),[actionError,setActionError]=useState(''),[busy,setBusy]=useState(false);
 const sequence=useRef(0),lock=useRef(false);
 const load=useCallback(async()=>{
  const current=++sequence.current;setLoading(true);setFailed(false);
  try{
   const s=getSupabaseBrowserClient();const {data:{user},error}=await s.auth.getUser();if(error)throw error;
   if(current!==sequence.current)return;setUserId(user?.id||null);
   if(!user){setRow(null);setEvents(null);return;}
   const [record,history]=await Promise.allSettled([
    s.from('support_cases').select('id,title,public_summary,status,created_at,updated_at').eq('id',id).eq('owner_user_id',user.id).maybeSingle(),
    s.from('support_case_events').select('id,case_id,event_type,status,note,created_at').eq('case_id',id).eq('visible_to_owner',true).order('created_at',{ascending:true})
   ]);
   if(current!==sequence.current)return;
   const readable=record.status==='fulfilled'&&!record.value.error;
   if(!readable||record.value.data!==null&&!caseRow(record.value.data,id)){setRow(null);setFailed(true);}else setRow(record.value.data as CaseRow|null);
   setEvents(history.status==='fulfilled'&&!history.value.error&&caseEvents(history.value.data,id)?history.value.data:null);
  }catch{if(current===sequence.current){setRow(null);setEvents(null);setFailed(true);}}
  finally{if(current===sequence.current)setLoading(false);}
 },[id]);
 useEffect(()=>{setReply('');setNotice(false);setActionError('');void load();return()=>{sequence.current++;};},[load]);
 const currentRow=row?.id===id?row:null,closed=!!currentRow&&['completed','rejected','cancelled'].includes(currentRow.status);
 async function send(){
  if(lock.current||busy||loading||failed||!currentRow||closed||!userId||!reply.trim())return;
  lock.current=true;setBusy(true);setNotice(false);setActionError('');const current=sequence.current;
  try{
   const s=getSupabaseBrowserClient();const {data:{user},error}=await s.auth.getUser();if(error||user?.id!==userId)throw new Error('owner_session_changed');
   const result=await s.rpc('owner_reply_support_case',{p_case_id:id,p_message:reply.trim()});if(result.error)throw result.error;
   if(current!==sequence.current)return;setReply('');setNotice(true);await load();
  }catch(error){if(current===sequence.current){setActionError((error as {message?:string})?.message?.includes('case_closed')?message.closed:message.sendFailed);if((error as {message?:string})?.message?.includes('case_closed'))await load();}}
  finally{lock.current=false;setBusy(false);}
 }
 return <section className="caseDetail" aria-label={c.kind} aria-busy={loading||busy}>
 <nav className="caseDetailActions" aria-label={c.back}><Link prefetch={false} href="/account/requests">{c.back}</Link><Link prefetch={false} href="/account/notifications">{message.notifications}</Link><Link prefetch={false} href="/care-actions/request">{message.newRequest}</Link></nav>
 <button disabled={loading||busy} onClick={()=>void load()}>{message.retry}</button>
 {notice&&<p className="workflowNotice" role="status">{c.sent}</p>}
 {actionError&&<p className="workflowNotice" role="alert">{actionError}</p>}
 {loading?<p role="status">{c.loading}</p>:failed?<div className="privacyCallout" role="alert">{message.caseFailed}</div>:!userId?<div className="privacyCallout"><strong>{c.signin}</strong><p>{c.private}</p><Link href={'/login?next='+encodeURIComponent('/account/requests/support/'+id)}>{message.login}</Link></div>:!currentRow?<div className="privacyCallout"><strong>{c.notFound}</strong><p>{c.private}</p></div>:<div className="caseCard">
 <div className="stateMeta"><small>{c.kind}</small><span>{currentRow.id.slice(0,8)}</span></div><h2>{currentRow.title}</h2>
 <div className="stateRow"><span className={`statusChip status-${currentRow.status}`}>{c.labels[currentRow.status]||currentRow.status}</span><span>{c.updated}{new Date(currentRow.updated_at).toLocaleDateString(dateLocale[locale])}</span></div>
 {currentRow.public_summary&&<p>{currentRow.public_summary}</p>}
 <div className="caseTimeline"><h4>{c.timeline}</h4>{events===null?<p role="alert">{message.historyFailed}</p>:events.length?events.map(e=><div className="timelineItem" key={e.id}><span>{new Date(e.created_at).toLocaleDateString(dateLocale[locale])}</span><div><strong>{c.events[e.event_type]||c.events.fallback}</strong>{e.note&&<p>{e.note}</p>}</div></div>):<p className="formNote">{c.building}</p>}</div>
 {closed?<p>{message.closed}</p>:<div className="caseReply"><label>{message.reply}<textarea aria-label={message.reply} placeholder={currentRow.status==='needs_info'?c.needPlaceholder:c.replyPlaceholder} value={reply} disabled={busy} onChange={e=>setReply(e.target.value)}/></label><button disabled={busy||!reply.trim()} onClick={()=>void send()}>{busy?message.busy:c.submit}</button></div>}
 </div>}
 </section>;
}
