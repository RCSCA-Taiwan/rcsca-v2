'use client';
import {useEffect,useMemo,useState} from 'react';
import {getSupabaseBrowserClient} from '../../lib/supabase-browser';

type Job={id:string;title:string;description:string|null};
type Req={id:string;request_kind:string;title:string;status:string;created_at:string};
const statusLabel:Record<string,string>={submitted:'已送出',under_review:'審核中',needs_info:'待補資料',approved:'已核准',matched:'媒合中',completed:'已完成',rejected:'未通過',cancelled:'已取消'};
export default function LiveMemberNetworkHub(){
 const [loading,setLoading]=useState(true),[signed,setSigned]=useState(false),[member,setMember]=useState(false),[jobs,setJobs]=useState<Job[]>([]),[requests,setRequests]=useState<Req[]>([]);
 useEffect(()=>{(async()=>{const s=getSupabaseBrowserClient();const {data:{session}}=await s.auth.getSession();if(!session){setLoading(false);return}setSigned(true);
  const [{data:m},{data:j},{data:r}]=await Promise.all([
   s.from('memberships').select('membership_type,status').eq('user_id',session.user.id).eq('status','active').in('membership_type',['annual','lifetime']).maybeSingle(),
   s.from('enterprise_shares').select('id,title,description').eq('share_type','job').eq('status','approved').eq('public_result',true).order('created_at',{ascending:false}).limit(3),
   s.from('network_requests').select('id,request_kind,title,status,created_at').eq('requester_user_id',session.user.id).order('created_at',{ascending:false}).limit(5)
  ]);
  setMember(!!m);setJobs((j||[]) as Job[]);setRequests((r||[]) as Req[]);setLoading(false);
 })()},[]);
 const active=useMemo(()=>requests.filter(x=>!['completed','rejected','cancelled'].includes(x.status)).length,[requests]);
 if(loading)return <div className="liveAccountLoading">正在確認會員與 Network 狀態…</div>;
 if(!signed)return <div className="privacyCallout"><strong>深層共享屬於登入後功能。</strong><p>公開 1% Network 人人可以瀏覽；生活找人、工作意願與人才媒合需登入後進行。</p><a href="/login">登入 MY 1% →</a></div>;
 if(!member)return <div className="privacyCallout"><strong>這個區域保留給 RCSCA MEMBER。</strong><p>你的帳號可以使用 MY 1% 與公開 Network；正式會員身份由協會核實後開啟深層媒合功能。</p><a href="/account/identity">查看身份與使用權限 →</a></div>;
 return <>
  <div className="portalGrid three memberNetworkSummary"><article><small>我的媒合</small><h3>{active} 件進行中</h3><p>需求、工作意願與人才媒合都集中在同一條進度線。</p><a href="/account/requests">查看我的進度 →</a></article><article><small>公開工作機會</small><h3>{jobs.length ? `${jobs.length} 筆最新` : '目前無新職缺'}</h3><p>只顯示企業已核准且同意公開的工作共享。</p><a href="/member-network/jobs">查看工作機會 →</a></article><article><small>聯絡交換</small><h3>雙方同意後才發生</h3><p>深層 Network 不提供會員名冊下載，也不直接公開私人聯絡資料。</p><a href="/1percent-network/matches">查看媒合回應 →</a></article></div>
  {jobs.length>0&&<div className="jobList memberJobPreview">{jobs.map(j=><article key={j.id}><div><small>1% PARTNER · 已核准工作共享</small><h3>{j.title}</h3><p>{j.description||'企業尚未提供更多公開說明。'}</p></div><a href="/member-network/jobs">查看職缺</a></article>)}</div>}
  {requests.length>0&&<section className="memberRequestSnapshot"><div className="sectionHead compact"><div><div className="eyebrow">我的最近需求</div><h2>不需要重新猜現在走到哪裡。</h2></div></div><div className="partnerReviewList">{requests.slice(0,3).map(r=><article key={r.id}><div className="partnerReviewMain"><small>{r.request_kind} · {statusLabel[r.status]||r.status}</small><h3>{r.title}</h3><p>{new Date(r.created_at).toLocaleDateString('zh-TW')}</p></div></article>)}</div></section>}
 </>;
}
