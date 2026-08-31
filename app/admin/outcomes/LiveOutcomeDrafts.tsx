'use client';
import {useEffect,useState} from 'react';
import {getSupabaseBrowserClient} from '../../../lib/supabase-browser';
type Story={id:string;title:string;summary:string;status:string;consent_confirmed:boolean;anonymized:boolean};
type Asset={id:string;title:string;summary:string;period_label:string|null;status:string};
export default function LiveOutcomeDrafts(){
 const [stories,setStories]=useState<Story[]>([]),[assets,setAssets]=useState<Asset[]>([]),[msg,setMsg]=useState('');
 async function load(){const sb=getSupabaseBrowserClient();if(!sb)return;const [s,a]=await Promise.all([sb.from('cycle_stories').select('id,title,summary,status,consent_confirmed,anonymized').in('status',['draft','submitted','needs_info']),sb.from('enterprise_esg_assets').select('id,title,summary,period_label,status').in('status',['draft','submitted','needs_info'])]);setStories((s.data||[]) as Story[]);setAssets((a.data||[]) as Asset[])}
 useEffect(()=>{load()},[]);
 async function publishStory(x:Story){const sb=getSupabaseBrowserClient();if(!sb)return;const consent=window.confirm('確認已取得公開同意？沒有同意不得發布。');if(!consent)return;const anonymized=window.confirm('此案例是否已完成必要匿名化？按「取消」代表不需要匿名化。');const {error}=await sb.rpc('admin_publish_cycle_story',{p_story_id:x.id,p_title:x.title,p_summary:x.summary,p_consent:true,p_anonymized:anonymized,p_note:'後台人工確認發布'});setMsg(error?'發布失敗，請確認權限與內容。':'善循環案例已發布。');await load()}
 async function approveAsset(x:Asset){const sb=getSupabaseBrowserClient();if(!sb)return;const {error}=await sb.rpc('admin_approve_esg_asset',{p_asset_id:x.id,p_title:x.title,p_summary:x.summary,p_period_label:x.period_label,p_note:'後台人工確認完成'});setMsg(error?'ESG 素材核准失敗。':'ESG 素材已完成，企業端將收到通知。');await load()}
 return <section className="panel"><div className="section-head"><h2>成果草稿審核</h2><span>{stories.length+assets.length} 筆</span></div>{msg&&<p>{msg}</p>}<div className="grid">{stories.map(x=><article className="card" key={x.id}><span className="eyebrow">善循環案例</span><h3>{x.title}</h3><p>{x.summary}</p><p className="muted">公開前必須確認同意；需要時完成匿名化。</p><button className="button" onClick={()=>publishStory(x)}>確認並發布</button></article>)}{assets.map(x=><article className="card" key={x.id}><span className="eyebrow">企業 ESG 素材</span><h3>{x.title}</h3><p>{x.summary}</p><p className="muted">{x.period_label||'尚未設定期間'}</p><button className="button" onClick={()=>approveAsset(x)}>完成企業素材</button></article>)}</div></section>
}
