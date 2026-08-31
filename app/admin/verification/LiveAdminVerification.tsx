'use client';
import {useEffect,useState} from 'react';
import {getSupabaseBrowserClient} from '../../../lib/supabase-browser';

type Row={id:string;participation_type:string;status:string;created_at:string;activity_id:string;activities:{name:string}|null;profiles:{display_name:string|null;email:string|null}|null};
export default function LiveAdminVerification(){const [rows,setRows]=useState<Row[]>([]),[loading,setLoading]=useState(true),[notice,setNotice]=useState('');
 async function load(){const s=getSupabaseBrowserClient();const {data:{session}}=await s.auth.getSession();if(!session){setNotice('請先使用具審核權限的帳號登入。');setLoading(false);return;}const {data,error}=await s.from('activity_participations').select('id,participation_type,status,created_at,activity_id,activities(name),profiles(display_name,email)').eq('status','pending').order('created_at',{ascending:true});if(error){setNotice('目前帳號沒有活動核實權限，或資料讀取失敗。');setRows([])}else setRows((data||[]) as any);setLoading(false)}
 useEffect(()=>{load()},[]);
 async function verify(id:string,approved:boolean){const s=getSupabaseBrowserClient();const {error}=await s.rpc('admin_verify_participation',{p_participation_id:id,p_approved:approved,p_note:approved?'後台人工核實完成':'後台人工駁回'});if(error){setNotice('操作未完成：目前帳號可能沒有活動審核權限。');return;}setNotice(approved?'已完成核實並建立共享足跡。':'已駁回這筆參與紀錄。');await load()}
 if(loading)return <div className="liveAccountLoading">正在讀取待核實紀錄…</div>;
 return <>{notice&&<div className="workflowNotice">{notice}</div>}<div className="verificationTable"><div className="vtHead"><span>活動／參與者</span><span>參與方式</span><span>狀態</span><span>操作</span></div>{rows.length?rows.map(x=><div className="vtRow" key={x.id}><span><b>{x.activities?.name||'活動'}</b><small>{x.profiles?.display_name||x.profiles?.email||'參與者'} · {x.id.slice(0,8)}</small></span><span>{x.participation_type}</span><span><i>待核實</i></span><span className="verifyActions"><button onClick={()=>verify(x.id,true)}>核實完成</button><button className="secondaryAction" onClick={()=>verify(x.id,false)}>駁回</button></span></div>):<div className="emptyData">目前沒有待核實紀錄，或目前帳號沒有查看此佇列的權限。</div>}</div></>}
