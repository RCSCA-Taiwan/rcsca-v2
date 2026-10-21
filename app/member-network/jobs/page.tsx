"use client";

import SiteHeader from '../../SiteHeader';
import {useEffect,useRef,useState} from 'react';
import {getSupabaseBrowserClient} from '../../../lib/supabase-browser';
import {useI18n} from '../../i18n';
import {networkCopy} from '../../networkCopy';

type Job={id:string;title:string;description:string|null;enterprise_id:string};
type OwnedInterest={private_detail:string|null};
const historyError:Record<string,string>={
  'zh-Hant':'目前無法確認你已送出的工作意願，為避免重複送出，請重新讀取後再操作。',
  en:'We cannot confirm your previously submitted job interests. Reload before submitting to avoid duplicates.',
  ja:'送信済みの仕事への関心を確認できません。重複送信を避けるため、再読み込みしてから操作してください。',
  ko:'이미 제출한 일자리 관심 기록을 확인할 수 없습니다. 중복 제출을 막기 위해 다시 불러온 뒤 진행해 주세요.',
};

export default function Jobs() {
  const {locale}=useI18n(), c=networkCopy[locale];
  const [jobs,setJobs]=useState<Job[]>([]),[applied,setApplied]=useState<string[]>([]);
  const [loading,setLoading]=useState(true),[loadFailed,setLoadFailed]=useState(false),[historyFailed,setHistoryFailed]=useState(false),[attempt,setAttempt]=useState(0);
  const [message,setMessage]=useState(''),[busy,setBusy]=useState('');
  const submitting=useRef(false);

  useEffect(()=>{
    let active=true;
    setLoading(true); setLoadFailed(false); setHistoryFailed(false);
    (async()=>{
      const client=getSupabaseBrowserClient();
      try {
        const {data,error}=await client.from('enterprise_shares').select('id,title,description,enterprise_id')
          .eq('share_type','job').eq('status','approved').eq('public_result',true)
          .order('created_at',{ascending:false});
        if(error) throw error;
        if(active) setJobs((data||[]) as Job[]);
      } catch { if(active) setLoadFailed(true); }

      try {
        const {data:{session},error:authError}=await client.auth.getSession();
        if(authError) throw authError;
        if(!session){if(active)setApplied([]);return;}
        const {data,error}=await client.from('network_requests').select('private_detail')
          .eq('requester_user_id',session.user.id).eq('request_kind','job_interest');
        if(error) throw error;
        const ids=((data||[]) as OwnedInterest[]).flatMap(row=>{
          const match=row.private_detail?.match(/^來源 enterprise_share:([0-9a-f-]{36})$/i);
          return match?[match[1]]:[];
        });
        if(active) setApplied([...new Set(ids)]);
      } catch { if(active) setHistoryFailed(true); }
      finally { if(active) setLoading(false); }
    })();
    return ()=>{active=false;};
  },[attempt]);

  async function apply(job:Job) {
    if(submitting.current||loading||loadFailed||historyFailed||applied.includes(job.id)) return;
    submitting.current=true; setBusy(job.id); setMessage('');
    try {
      const client=getSupabaseBrowserClient();
      const {data:{session},error:authError}=await client.auth.getSession();
      if(authError) throw authError;
      if(!session){setMessage(c.jobsLogin);return;}
      const {error}=await client.rpc('member_submit_network_request',{
        p_request_kind:'job_interest',p_title:`工作意願｜${job.title}`,
        p_public_summary:`對公開工作機會「${job.title}」有興趣`,
        p_private_detail:`來源 enterprise_share:${job.id}`,p_requester_enterprise_id:undefined,
      });
      if(error){setMessage(error.message.includes('active_membership_required')?c.jobsMember:c.jobsFailed);return;}
      setApplied(ids=>ids.includes(job.id)?ids:[...ids,job.id]); setMessage(c.jobsDone);
    } catch { setMessage(c.jobsFailed); }
    finally { submitting.current=false; setBusy(''); }
  }

  return <main className="directoryPage"><SiteHeader/>
    <section className="memberNetHero"><div className="portalWrap"><div className="eyebrow">{c.jobsEye}</div><h1>{c.jobsTitle}</h1><p>{c.jobsLead}</p></div></section>
    <section className="portalSection"><div className="portalWrap">
      {message&&<div className="privacyCallout"><p role="status" aria-live="polite">{message}</p>
        <a className="textRoute" href="/account/requests">{c.myRequests}</a>
      </div>}
      {historyFailed&&<div className="workflowNotice"><p role="alert">{historyError[locale]}</p><button type="button" className="button secondary" onClick={()=>setAttempt(value=>value+1)}>{c.retry}</button></div>}
      {loading?<p className="liveAccountLoading" role="status">{c.jobsLoading}</p>:loadFailed?<div>
        <p role="alert">{c.jobsLoadError}</p><button type="button" className="button secondary" onClick={()=>setAttempt(value=>value+1)}>{c.retry}</button>
      </div>:<div className="jobBoard">{jobs.length?jobs.map(job=><article key={job.id}>
        <div><small>{c.jobShare}</small><h3>{job.title}</h3><p>{job.description||c.jobMore}</p></div>
        <button type="button" disabled={!!busy||historyFailed||applied.includes(job.id)} onClick={()=>void apply(job)}>
          {busy===job.id?c.sending:applied.includes(job.id)?c.sent:c.interest}
        </button>
      </article>):<article><div><small>{c.noJobs}</small><h3>{c.openNode}</h3><p>{c.openNodeDesc}</p></div>
        <a className="textRoute" href="/1percent-partner">{c.offerJob}</a>
      </article>}</div>}
    </div></section>
  </main>;
}
