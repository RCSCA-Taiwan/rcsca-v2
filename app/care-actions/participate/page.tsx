'use client';
import ActivityWorkspaceNav from '../../components/ActivityWorkspaceNav';
import SiteHeader from '../../SiteHeader';import {FormEvent,useEffect,useRef,useState} from 'react';import {useSearchParams} from 'next/navigation';import {getSupabaseBrowserClient} from '../../../lib/supabase-browser';import {Locale,useI18n} from '../../i18n';
type Activity={id:string;name:string;code:string};
const copy:Record<Locale,any>={
 'zh-Hant':{loading:'正在讀取可登記活動…',loadError:'活動清單讀取失敗，請重新讀取。',retry:'重新讀取',registered:'已登記',eye:'公益行動 · 參與登記',title:'先留下「我會參與」，付款方式不決定共享價值。',lead:'共享紀錄依是否完成參與建立，不依金額決定共享等級。',signin:'請先登入，再登記參與。',none:'目前沒有可登記的公開活動。',duplicate:'你已經登記過這個活動。',failed:'登記失敗，請確認登入狀態與活動是否仍開放。',done:'已登記。活動完成後由 RCSCA 核實是否完成參與。',activity:'選擇目前活動',method:'預計交付／參與方式',transfer:'轉帳',cash:'現金',volunteer:'現場參與',contact:'由 RCSCA 聯絡',sending:'登記中…',submit:'登記參與 →',aside:'財務與共享足跡分開',asideLead:'付款方式或金額不會直接改變共享等級。活動完成後才由 RCSCA 核實是否完成參與。'},
 en:{loading:'Loading available activities…',loadError:'Unable to load activities. Please retry.',retry:'Retry',registered:'Registered',eye:'Care Action · Registration',title:'Record your intent to participate; payment method does not define sharing value.',lead:'Sharing records are based on completed participation, and Sharing Level is never determined by amount.',signin:'Please sign in before registering.',none:'No public activity is currently open for registration.',duplicate:'You have already registered for this activity.',failed:'Registration failed. Check your sign-in status and whether the activity is still open.',done:'Registered. RCSCA will verify participation after the activity is completed.',activity:'Choose an activity',method:'Expected delivery / participation method',transfer:'Bank transfer',cash:'Cash',volunteer:'Participate on site',contact:'Contact me through RCSCA',sending:'Registering…',submit:'Register participation →',aside:'Finance and sharing footprints stay separate',asideLead:'Payment method or amount does not directly change Sharing Level. RCSCA verifies participation only after the activity is completed.'},
 ja:{loading:'受付中の活動を読み込み中…',loadError:'活動一覧を読み込めませんでした。再読み込みしてください。',retry:'再読み込み',registered:'登録済み',eye:'公益活動 · 参加登録',title:'まず「参加する」意思を記録。支払方法で共有の価値は決まりません。',lead:'共有記録は参加完了に基づき、金額で共有レベルを決めません。',signin:'ログインしてから参加登録してください。',none:'現在登録できる公開活動はありません。',duplicate:'この活動にはすでに登録しています。',failed:'登録できませんでした。ログイン状態と活動の受付状況を確認してください。',done:'登録しました。活動完了後、RCSCAが参加完了を確認します。',activity:'現在の活動を選択',method:'予定する提供／参加方法',transfer:'振込',cash:'現金',volunteer:'現地参加',contact:'RCSCAから連絡',sending:'登録中…',submit:'参加登録 →',aside:'金銭と共有の足跡は別に扱います',asideLead:'支払方法や金額は共有レベルを直接変えません。活動完了後にRCSCAが参加を確認します。'},
 ko:{loading:'등록 가능한 활동 불러오는 중…',loadError:'활동 목록을 불러오지 못했습니다. 다시 시도해 주세요.',retry:'다시 불러오기',registered:'등록 완료',eye:'공익 활동 · 참여 등록',title:'먼저 참여 의사를 남기며 결제 방식이 공유 가치를 결정하지 않습니다.',lead:'공유 기록은 참여 완료 여부에 따라 생성되며 금액으로 공유 레벨을 결정하지 않습니다.',signin:'로그인 후 참여를 등록해 주세요.',none:'현재 등록 가능한 공개 활동이 없습니다.',duplicate:'이미 이 활동에 등록했습니다.',failed:'등록하지 못했습니다. 로그인 상태와 활동 접수 여부를 확인하세요.',done:'등록했습니다. 활동 완료 후 RCSCA가 참여 완료 여부를 확인합니다.',activity:'현재 활동 선택',method:'예정된 제공／참여 방식',transfer:'계좌이체',cash:'현금',volunteer:'현장 참여',contact:'RCSCA 연락 요청',sending:'등록 중…',submit:'참여 등록 →',aside:'재정과 공유 발자취는 별도로 관리합니다',asideLead:'결제 방식이나 금액은 공유 레벨을 직접 바꾸지 않습니다. 활동 완료 후 RCSCA가 참여를 확인합니다.'}
};
export default function Participate() {
  const {locale}=useI18n(), c=copy[locale];
  const requestedActivity=useSearchParams().get('activity')||'';
  const [activities,setActivities]=useState<Activity[]>([]);
  const [activityId,setActivityId]=useState(''),[method,setMethod]=useState('');
  const [message,setMessage]=useState(''),[sending,setSending]=useState(false);
  const [loading,setLoading]=useState(true),[loadFailed,setLoadFailed]=useState(false),[attempt,setAttempt]=useState(0);
  const [registered,setRegistered]=useState<string[]>([]);
  const submitting=useRef(false);
  useEffect(()=>{
    let active=true;
    setLoading(true); setLoadFailed(false);
    (async()=>{
      try {
        const client=getSupabaseBrowserClient();
        const {data,error}=await client.from('activities').select('id,name,code')
          .in('status',['published','active']).order('starts_at',{ascending:true});
        if(error) throw error;
        if(!active) return;
        const next=(data||[]) as Activity[];
        setActivities(next);
        setActivityId(current=>next.some(a=>a.id===requestedActivity)?requestedActivity:
          next.some(a=>a.id===current)?current:next[0]?.id||'');
      } catch { if(active) setLoadFailed(true); }
      finally { if(active) setLoading(false); }
    })();
    return ()=>{active=false;};
  },[requestedActivity,attempt]);
  async function submit(event:FormEvent) {
    event.preventDefault();
    if(submitting.current||loading||loadFailed||registered.includes(activityId)) return;
    submitting.current=true; setSending(true); setMessage('');
    try {
      const client=getSupabaseBrowserClient();
      const {data:{session},error:authError}=await client.auth.getSession();
      if(authError) throw authError;
      if(!session){setMessage(c.signin);return;}
      if(!activities.some(a=>a.id===activityId)){setMessage(c.none);return;}
      const {error}=await client.rpc('activity_register_participation',{
        p_activity_id:activityId,p_source_channel:method||'website',
      });
      if(error){
        setMessage(error.code==='23505'?c.duplicate:c.failed);
        if(error.code==='23505') setRegistered(ids=>[...ids,activityId]);
        return;
      }
      setRegistered(ids=>[...ids,activityId]); setMessage(c.done);
    } catch { setMessage(c.failed); }
    finally { submitting.current=false; setSending(false); }
  }
  return <main className="flowPage"><SiteHeader/>
    <section className="flowHero"><div className="portalWrap"><div className="eyebrow">{c.eye}</div><h1>{c.title}</h1><p>{c.lead}</p></div></section>
    <section className="portalSection"><div className="portalWrap actionForm">
      <form onSubmit={submit}>
        {loading?<p role="status">{c.loading}</p>:loadFailed?<div><p role="alert">{c.loadError}</p>
          <button type="button" className="button secondary" onClick={()=>setAttempt(value=>value+1)}>{c.retry}</button>
        </div>:!activities.length?<p>{c.none}</p>:null}
        <div className="briefFields">
          <label><span className="srOnly">{c.activity}</span><select required disabled={loading||loadFailed||sending} value={activityId} onChange={event=>setActivityId(event.target.value)}>
            <option value="">{c.activity}</option>{activities.map(activity=><option value={activity.id} key={activity.id}>{activity.name}</option>)}
          </select></label>
          <label><span className="srOnly">{c.method}</span><select disabled={loading||loadFailed||sending} value={method} onChange={event=>setMethod(event.target.value)}>
            <option value="">{c.method}</option><option value="transfer">{c.transfer}</option><option value="cash">{locale==='zh-Hant'?'現金轉交':c.cash}</option>
          </select></label>
        </div>
        <button className="submitLead" disabled={sending||loading||loadFailed||!activityId||registered.includes(activityId)}>
          {sending?c.sending:registered.includes(activityId)?c.registered:c.submit}
        </button>
        {message&&<div className="authMessage sent" role="status" aria-live="polite">{message}</div>}
      </form>
      <aside><b>{c.aside}</b><p>{c.asideLead}</p></aside>
      <ActivityWorkspaceNav/>
    </div></section>
  </main>;
}
