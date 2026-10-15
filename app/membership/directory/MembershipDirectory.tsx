'use client';
import Link from 'next/link';
import {useEffect,useRef,useState} from 'react';
import {getMembershipClient as getSupabaseBrowserClient} from '../../../lib/membership-api';
import {membershipError,taiwanYear,type DirectoryMember} from '../../../lib/membership';
export default function MembershipDirectory(){
  const [year,setYear]=useState(taiwanYear),[members,setMembers]=useState<DirectoryMember[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[search,setSearch]=useState('');
  const request=useRef(0);
  async function load(selected:number){const id=++request.current;setLoading(true);setError('');setMembers([]);try{const {data,error:e}=await getSupabaseBrowserClient().rpc('membership_directory',{p_year:selected});if(e)throw e;if(id===request.current)setMembers((data||[]) as unknown as DirectoryMember[]);}catch(e){if(id===request.current)setError(membershipError(e));}finally{if(id===request.current)setLoading(false);}}
  useEffect(()=>{void load(year);return()=>{request.current++;};},[year]);
  const visible=members.filter(m=>m.name.includes(search.trim())||(m.referrer_name||'').includes(search.trim()));
  return <div className="membershipWorkspace"><div className="membershipCardHead"><h2>{year} 年度會員名冊</h2><Link className="primaryFlow" href="/membership/apply">入會／續會申請</Link></div><div className="membershipFields"><label>年度<input type="number" min={1900} max={taiwanYear()} value={year} onChange={e=>{const n=Number(e.target.value);if(n>=1900&&n<=taiwanYear())setYear(n);}}/></label><label>搜尋姓名或介紹人<input type="search" maxLength={100} value={search} onChange={e=>setSearch(e.target.value)}/></label></div>
    <p>名冊限有效協會會員與會員管理員查看。歷史資料由協會逐筆核對，尚未完成核對者不會自動補入；未登錄的介紹人顯示「未登錄」。聯絡資料與身分證不在名冊中。</p>
    {loading?<p role="status">正在讀取名冊…</p>:error?<div className="workflowNotice" role="alert">{error}<button onClick={()=>void load(year)}>重新讀取</button><Link href="/login?next=%2Fmembership%2Fdirectory">前往登入</Link></div>:<><p role="status">{visible.length} 位會員</p><div className="membershipRoster">{visible.length?visible.map(m=><article className="membershipCard" key={m.id}><div className="membershipCardHead"><h3>{m.name}</h3><strong>{m.membership_type==='lifetime'?'永久會員':'一般會員'}</strong></div><dl><div><dt>正式入會日期</dt><dd>{m.member_since}</dd></div><div><dt>介紹人</dt><dd>{m.referrer_name||'未登錄'}</dd></div></dl></article>):<p className="privacyCallout">{search?'沒有符合條件的會員。':'這個年度尚無已核對的名冊紀錄。'}</p>}</div></>}
  </div>;
}
