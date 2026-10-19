'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {getSupabaseBrowserClient} from '../../../lib/supabase-browser';
import {Locale,useI18n} from '../../i18n';
import {notificationRoutes} from '../../../lib/notification-routes';
import './notifications.css';
type N={id:string;kind:string;title:string;body:string|null;related_type:string|null;related_id:string|null;read_at:string|null;created_at:string};
const copy:Record<Locale,any>={
 'zh-Hant':{retry:'重新讀取通知',markFail:'目前無法更新這則通知，請重試。',fulfillment:'供應方履約工作台（需供應權限） →',loadFail:'目前無法讀取通知。',allFail:'目前無法更新全部通知。',loading:'正在讀取通知…',mine:'我的通知',guest:'登入後才會看到自己的進度。',guestLead:'企業審核、公益核實與媒合聯絡同意都會在這裡留下通知。',login:'登入 →',all:'全部標為已讀',fallback:'狀態已更新。',progress:'查看相關進度 →',unread:'標為未讀',ack:'我知道了',empty:'目前沒有新的通知。'},
 en:{retry:'Reload notifications',markFail:'This notification could not be updated. Please retry.',fulfillment:'Provider fulfillment workspace (permission required) →',loadFail:'Notifications cannot be loaded right now.',allFail:'All notifications cannot be updated right now.',loading:'Loading notifications…',mine:'My notifications',guest:'Sign in to see your progress.',guestLead:'Enterprise reviews, participation verification, and consent for matching contacts will appear here.',login:'Sign in →',all:'Mark all as read',fallback:'The status was updated.',progress:'View related progress →',unread:'Mark as unread',ack:'Got it',empty:'No new notifications right now.'},
 ja:{retry:'通知を再読み込み',markFail:'通知を更新できませんでした。再試行してください。',fulfillment:'提供者の履行管理（権限が必要） →',loadFail:'現在、通知を読み込めません。',allFail:'現在、すべての通知を更新できません。',loading:'通知を読み込み中…',mine:'自分の通知',guest:'ログインすると自分の進捗を確認できます。',guestLead:'企業審査、公益参加の確認、マッチング連絡への同意がここに通知されます。',login:'ログイン →',all:'すべて既読にする',fallback:'ステータスが更新されました。',progress:'関連する進捗を見る →',unread:'未読にする',ack:'確認しました',empty:'新しい通知はありません。'},
 ko:{retry:'알림 다시 불러오기',markFail:'알림을 업데이트하지 못했습니다. 다시 시도해 주세요.',fulfillment:'공급자 이행 관리 (권한 필요) →',loadFail:'현재 알림을 불러올 수 없습니다.',allFail:'현재 모든 알림을 업데이트할 수 없습니다.',loading:'알림을 불러오는 중…',mine:'내 알림',guest:'로그인 후 나의 진행 상황을 확인할 수 있습니다.',guestLead:'기업 심사, 공익 참여 확인 및 매칭 연락 동의가 여기에 알림으로 표시됩니다.',login:'로그인 →',all:'모두 읽음 처리',fallback:'상태가 업데이트되었습니다.',progress:'관련 진행 보기 →',unread:'읽지 않음으로 표시',ack:'확인했어요',empty:'새 알림이 없습니다.'}
};
const dateLocale:Record<Locale,string>={'zh-Hant':'zh-TW',en:'en-US',ja:'ja-JP',ko:'ko-KR'};
export default function LiveNotifications(){
 const {locale}=useI18n();const c=copy[locale];
 const [loading,setLoading]=useState(true),[signedIn,setSignedIn]=useState(false),[rows,setRows]=useState<N[]>([]),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const request=useRef(0),acting=useRef(false);
 const load=useCallback(async()=>{
  const sequence=++request.current;
  setLoading(true);setNotice('');
  try{
   const s=getSupabaseBrowserClient();
   const {data:{session},error:sessionError}=await s.auth.getSession();
   if(sessionError)throw sessionError;
   if(sequence!==request.current)return;
   setSignedIn(!!session);
   if(!session){setRows([]);return;}
   const {data,error}=await s.from('user_notifications').select('id,kind,title,body,related_type,related_id,read_at,created_at').eq('recipient_user_id',session.user.id).order('created_at',{ascending:false}).limit(50);
   if(error)throw error;
   if(sequence===request.current)setRows((data||[]) as N[]);
  }catch{
   if(sequence===request.current){setRows([]);setNotice(c.loadFail);}
  }finally{if(sequence===request.current)setLoading(false);}
 },[c]);
 useEffect(()=>{void load();return ()=>{request.current++;};},[load]);
 async function changeRead(id?:string,read=true){
  if(acting.current||loading)return;
  acting.current=true;setBusy(true);setNotice('');
  try{
   const s=getSupabaseBrowserClient();
   const {error}=id?await s.rpc('account_set_notification_read',{p_notification_id:id,p_read:read}):await s.rpc('account_mark_all_notifications_read');
   if(error)throw error;
   await load();
  }catch{setNotice(id?c.markFail:c.allFail);}
  finally{acting.current=false;setBusy(false);}
 }
 return <section className="accountNotifications" aria-busy={loading||busy}>
  {loading?<div className="liveAccountLoading" role="status">{c.loading}</div>:<>
   {notice&&<div className="workflowNotice" role="alert">{notice}</div>}
   <div className="notificationToolbar"><button type="button" disabled={busy} onClick={()=>void load()}>{c.retry}</button>{signedIn&&rows.some(x=>!x.read_at)&&<button type="button" disabled={busy} onClick={()=>void changeRead()}>{c.all}</button>}</div>
   {!signedIn&&!notice?<div className="liveAccountGuest"><div><small>{c.mine}</small><strong>{c.guest}</strong><p>{c.guestLead}</p></div><Link href="/login?next=%2Faccount%2Fnotifications">{c.login}</Link></div>:null}
   <div className="notificationList">{rows.map(n=><article className={n.read_at?'':'unread'} key={n.id}><div><small>{new Date(n.created_at).toLocaleString(dateLocale[locale])}</small><h3>{n.title}</h3><p>{n.body||c.fallback}</p><div className="notificationRoutes">{notificationRoutes(n).map(link=><Link className="textRoute" href={link.href} key={link.href}>{c[link.label]}</Link>)}</div></div><button type="button" disabled={busy} onClick={()=>void changeRead(n.id,!n.read_at)}>{n.read_at?c.unread:c.ack}</button></article>)}{signedIn&&!rows.length&&!notice&&<div className="emptyData">{c.empty}</div>}</div>
  </>}
 </section>;
}
