'use client';
import Link from 'next/link';
import {useActivityRecords} from '../../components/useActivityRecords';
import ActivityWorkspaceNav from '../../components/ActivityWorkspaceNav';
const labels:Record<string,string>={unverified:'尚未核實',pending:'待核實',verified:'已完成核實',rejected:'未完成／未通過'};
const channels:Record<string,string>={transfer:'轉帳',cash:'現金轉交',website:'網站登記'};
export default function LiveParticipationVerification(){
 const {loading,userId,authFailed,parts,load}=useActivityRecords(false);
 return <div className="activityVerification">
  {loading?<p role="status">正在讀取參與核實狀態…</p>:authFailed?<p role="alert">目前無法確認登入與活動核實紀錄，請重新讀取。</p>:!userId?<div className="privacyCallout"><strong>登入後查看自己的活動核實。</strong><p>參與者只會看到自己的紀錄。</p><Link href="/login?next=%2Fcare-actions%2Fverification">前往登入 →</Link></div>:parts===null?<p role="alert">目前無法讀取參與核實紀錄，請重新讀取。</p>:!parts.length?<div className="emptyData">目前沒有待核實或已核實的公益參與紀錄。</div>:<div className="verificationTable"><div className="vtHead"><span>公益行動</span><span>參與方式</span><span>完成狀態</span><span>核實時間</span></div>{parts.map(r=><div className="vtRow" key={r.id}><span>{r.activities?.name||'公益行動'}</span><span>{channels[r.source_channel||'website']||r.source_channel}</span><span>{labels[r.status]}</span><span>{r.verified_at?new Date(r.verified_at).toLocaleDateString('zh-TW',{timeZone:'Asia/Taipei'}):'尚未核實'}</span></div>)}</div>}
  <button className="activityRefresh" type="button" disabled={loading} onClick={()=>void load()}>重新讀取參與核實紀錄</button>
  <ActivityWorkspaceNav/>
 </div>;
}
