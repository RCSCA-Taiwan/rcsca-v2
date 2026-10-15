"use client";

import SiteHeader from '../../SiteHeader';
import {useEffect,useRef,useState} from 'react';
import {getSupabaseBrowserClient} from '../../../lib/supabase-browser';
import {useI18n} from '../../i18n';
import {networkCopy} from '../../networkCopy';

type Job={id:string;title:string;description:string|null;enterprise_id:string};
export default function Jobs() {
  const {locale}=useI18n(), c=networkCopy[locale];
  const [jobs,setJobs]=useState<Job[]>([]),[applied,setApplied]=useState<string[]>([]);
  const [loading,setLoading]=useState(true),[loadFailed,setLoadFailed]=useState(false),[attempt,setAttempt]=useState(0);
  const [message,setMessage]=useState(''),[busy,setBusy]=useState('');
  const submitting=useRef(false);
  useEffect(()=>{
    let active=true;
    setLoading(true); setLoadFailed(false);
    (async()=>{
      try {
        const client=getSupabaseBrowserClient();
        const {data,error}=await client.from('enterprise_shares').select('id,title,description,enterprise_id')
          .eq('share_type','job').eq('status','approved').eq('public_result',true)
          .order('created_at',{ascending:false});
        if(error) throw error;
        if(active) setJobs((data||[]) as Job[]);
      } catch { if(active) setLoadFailed(true); }
      finally { if(active) setLoading(false); }
    })();
    return ()=>{active=false;};
  },[attempt]);
  async function apply(job:Job) {
    if(submitting.current||loading||loadFailed||applied.includes(job.id)) return;
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
      setApplied(ids=>[...ids,job.id]); setMessage(c.jobsDone);
    } catch { setMessage(c.jobsFailed); }
    finally { submitting.current=false; setBusy(''); }
  }
  return <main className="directoryPage"><SiteHeader/>
    <section className="memberNetHero"><div className="portalWrap"><div className="eyebrow">{c.jobsEye}</div><h1>{c.jobsTitle}</h1><p>{c.jobsLead}</p></div></section>
    <section className="portalSection"><div className="portalWrap">
      {message&&<div className="privacyCallout"><p role="status" aria-live="polite">{message}</p>
        <a className="textRoute" href="/account/requests">{c.myRequests}</a>
      </div>}
      {loading?<p className="liveAccountLoading" role="status">{c.jobsLoading}</p>:loadFailed?<div>
        <p role="alert">{c.jobsLoadError}</p><button type="button" className="button secondary" onClick={()=>setAttempt(value=>value+1)}>{c.retry}</button>
      </div>:<div className="jobBoard">{jobs.length?jobs.map(job=><article key={job.id}>
        <div><small>{c.jobShare}</small><h3>{job.title}</h3><p>{job.description||c.jobMore}</p></div>
        <button type="button" disabled={!!busy||applied.includes(job.id)} onClick={()=>void apply(job)}>
          {busy===job.id?c.sending:applied.includes(job.id)?c.sent:c.interest}
        </button>
      </article>):<article><div><small>{c.noJobs}</small><h3>{c.openNode}</h3><p>{c.openNodeDesc}</p></div>
        <a className="textRoute" href="/1percent-partner">{c.offerJob}</a>
      </article>}</div>}
    </div></section>
  </main>;
}
