'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {getSupabaseBrowserClient} from '../../../lib/supabase-browser';
import EnterpriseShareComposer from './EnterpriseShareComposer';

type Enterprise={id:string;display_name:string|null;legal_name:string;industry:string|null;region:string|null;status:string};
type Share={id:string;title:string;share_type:string;status:string;public_result:boolean};
type Request={id:string;title:string;request_kind:string;status:string};
const statusLabel:Record<string,string>={draft:'草稿',submitted:'已送出',under_review:'審核中',needs_info:'待補資料',approved:'已核准',matched:'媒合中',completed:'已完成',rejected:'未通過',cancelled:'已取消'};
const shareLabel:Record<string,string>={care:'公益關懷',connection:'資源連結',benefit:'會員禮遇',job:'工作機會',professional:'專業共享',resource:'資源共享'};

export default function LivePartnerDashboard(){
 const [loading,setLoading]=useState(true); const [enterprise,setEnterprise]=useState<Enterprise|null>(null); const [shares,setShares]=useState<Share[]>([]); const [requests,setRequests]=useState<Request[]>([]); const [summary,setSummary]=useState<any>(null); const [error,setError]=useState('');
 async function reloadShares(){if(!enterprise)return;const s=getSupabaseBrowserClient();const {data}=await s.from('enterprise_shares').select('id,title,share_type,status,public_result').eq('enterprise_id',enterprise.id).order('created_at',{ascending:false});setShares((data||[]) as Share[])}
 useEffect(()=>{let alive=true; const supabase=getSupabaseBrowserClient(); (async()=>{const {data:{session}}=await supabase.auth.getSession(); if(!session){if(alive){setError('請先登入企業帳號');setLoading(false)};return;} const {data:eu,error:euErr}=await supabase.from('enterprise_users').select('enterprise_id,enterprises(id,display_name,legal_name,industry,region,status)').eq('user_id',session.user.id).limit(1).maybeSingle(); if(euErr){if(alive){setError('目前無法讀取企業身份');setLoading(false)};return;} const ent=(eu as any)?.enterprises as Enterprise|undefined; if(!ent){if(alive){setError('這個帳號尚未連結 1% 企業共享夥伴');setLoading(false)};return;} const [s,r]=await Promise.all([supabase.from('enterprise_shares').select('id,title,share_type,status,public_result').eq('enterprise_id',ent.id).order('created_at',{ascending:false}),supabase.from('network_requests').select('id,title,request_kind,status').eq('requester_enterprise_id',ent.id).order('created_at',{ascending:false})]); const {data:sum}=await supabase.from('enterprise_management_summary').select('*').eq('enterprise_id',ent.id).maybeSingle(); if(alive){setEnterprise(ent);setShares((s.data||[]) as Share[]);setRequests((r.data||[]) as Request[]);setSummary(sum);setLoading(false)}})(); return()=>{alive=false}},[]);
 if(loading)return <div className="liveAccountLoading">正在讀取企業共享狀態…</div>;
 if(error)return <div className="liveAccountGuest"><div><small>企業管理入口</small><strong>{error}</strong><p>企業帳號核准並完成連結後，才會看到內部共享與媒合紀錄。</p></div><Link href="/login">登入 →</Link></div>;
 const pending=[...shares.filter(x=>['submitted','under_review','needs_info'].includes(x.status)),...requests.filter(x=>['submitted','under_review','needs_info'].includes(x.status))].length;
 return <>
  {summary&&<div className="executiveSummary"><article><small>進行中 ESG 案件</small><strong>{summary.active_cases}</strong><span>目前正在評估或執行</span></article><article className={summary.overdue_cases>0?'attention':''}><small>需優先處理</small><strong>{summary.overdue_cases}</strong><span>已超過下一步預計日期</span></article><article><small>已核准成果</small><strong>{summary.approved_outcomes}</strong><span>已完成 RCSCA 成果審核</span></article><article className="good"><small>可正式交付</small><strong>{summary.deliverable_outcomes}</strong><span>品質與證據鏈均完成</span></article><article><small>SDG 涵蓋</small><strong>{summary.sdg_coverage}</strong><span>已核准成果涵蓋項目</span></article></div>}
  <div className="partnerSummary"><article><small>企業身份</small><strong>{enterprise?.display_name||enterprise?.legal_name}</strong><span>{enterprise?.industry||'產業待補'} · {enterprise?.region||'地區待補'}</span></article><article><small>本年度共享項目</small><strong>{shares.length}</strong><span>公益／連結／禮遇分流記錄</span></article><article><small>Network 需求</small><strong>{requests.length}</strong><span>由企業帳號真實讀取</span></article><article><small>待處理</small><strong>{pending}</strong><span>審核／補資料中的項目</span></article></div>
  <div className="sectionHead"><div><div className="eyebrow">企業共享紀錄</div><h2>每一筆都知道目前在哪一步。</h2></div><p>不以贊助金額排序。企業可提出共享內容，但不能自行核准或把內容直接公開。</p></div>
  <div className="enterpriseLedger"><div className="elHead"><span>類型</span><span>內容</span><span>狀態</span><span>公開</span></div>{shares.length?shares.map(x=><div className="elRow" key={x.id}><span>{shareLabel[x.share_type]||x.share_type}</span><span>{x.title}</span><span>{statusLabel[x.status]||x.status}</span><span>{x.public_result?'已公開':'未公開'}</span></div>):<div className="emptyData">目前還沒有企業共享紀錄。</div>}</div>
  {enterprise&&<EnterpriseShareComposer enterpriseId={enterprise.id} onSaved={reloadShares}/>}
 </>;
}
