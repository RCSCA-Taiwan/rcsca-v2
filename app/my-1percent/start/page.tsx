'use client';
import {useEffect,useState} from 'react';
import SiteHeader from '../../SiteHeader';
import {getSupabaseBrowserClient} from '../../../lib/supabase-browser';
import {Locale,useI18n} from '../../i18n';

const optionValues=['時間','專業','人脈連結','物資／資源','工作機會','陪伴','分享資訊','還不知道'];
const copy:Record<Locale,any>={
 'zh-Hant':{options:optionValues,signin:'請先登入，再建立你的 MY 1%。',failed:'目前無法儲存，請稍後再試。',eye:'建立 MY 1% · 我的共享',hero:'不用先想著「我要做多少」，先從「我有什麼」開始。',lead:'1% 沒有固定單位。它可以是一段時間、一項專業、一個人脈連結、一份資源，甚至只是你願意開始留意身邊的需要。',step1:'01 · 我的 1% 可能是',choose:'先選幾個最接近你的方式。',step2:'02 · 建立起點',doneTitle:'MY 1% 已記下',startTitle:'你的起點不需要完美。',savedPrefix:'已記下：',undefined:'尚未定義',savedLead:'。之後可以隨時修改；真正的共享等級仍由實際參與逐步形成。',startLead:'這裡只記錄你願意分享的方向，不會因為勾選項目就增加共享等級、XP 或點數。',saving:'儲存中…',saved:'已儲存 ✓',save:'儲存我的 MY 1% →',enter:'進入我的共享首頁 →',separator:'、'},
 'en':{options:['Time','Expertise','Network connections','Goods / resources','Job opportunities','Companionship','Useful information','Not sure yet'],signin:'Sign in before creating your MY 1%.',failed:'Unable to save right now. Please try again later.',eye:'Create MY 1% · My Sharing',hero:'Do not begin with “How much must I do?” Begin with “What do I have?”',lead:'1% has no fixed unit. It may be time, expertise, a useful connection, a resource, or simply a willingness to notice needs around you.',step1:'01 · My 1% might be',choose:'Choose a few options that feel closest to you.',step2:'02 · Create a starting point',doneTitle:'MY 1% recorded',startTitle:'Your starting point does not need to be perfect.',savedPrefix:'Recorded: ',undefined:'Not defined yet',savedLead:'. You can change this anytime. Your real sharing level still grows from verified participation.',startLead:'This records only the directions you may want to share. Selecting items does not increase level, XP, or points.',saving:'Saving…',saved:'Saved ✓',save:'Save my MY 1% →',enter:'Enter my sharing page →',separator:', '},
 'ja':{options:['時間','専門性','人脈のつながり','物資／資源','仕事の機会','同行・寄り添い','情報共有','まだ分からない'],signin:'ログインしてからMY 1%を作成してください。',failed:'現在保存できません。後ほど再度お試しください。',eye:'MY 1%を作成 · 私の共有',hero:'「どれだけするか」ではなく、「何を持っているか」から。',lead:'1%に固定の単位はありません。時間、専門性、人とのつながり、資源、あるいは身近なニーズに目を向ける気持ちでも構いません。',step1:'01 · 私の1%になり得るもの',choose:'自分に近い方法をいくつか選んでください。',step2:'02 · 出発点を作る',doneTitle:'MY 1%を記録しました',startTitle:'出発点は完璧でなくて大丈夫。',savedPrefix:'記録済み：',undefined:'未設定',savedLead:'。いつでも変更できます。実際の共有レベルは、実際の参加によって少しずつ形成されます。',startLead:'ここでは共有したい方向だけを記録します。選択だけでレベル、XP、ポイントが増えることはありません。',saving:'保存中…',saved:'保存済み ✓',save:'MY 1%を保存 →',enter:'私の共有ページへ →',separator:'、'},
 'ko':{options:['시간','전문성','인맥 연결','물품／자원','일자리','동행／돌봄','정보 공유','아직 모르겠음'],signin:'로그인한 뒤 MY 1%를 만들어 주세요.',failed:'현재 저장할 수 없습니다. 잠시 후 다시 시도해 주세요.',eye:'MY 1% 만들기 · 나의 공유',hero:'“얼마나 해야 할까”보다 “내게 무엇이 있을까”에서 시작하세요.',lead:'1%에는 고정된 단위가 없습니다. 시간, 전문성, 하나의 연결, 자원 또는 주변의 필요를 살피려는 마음일 수 있습니다.',step1:'01 · 나의 1%가 될 수 있는 것',choose:'나와 가장 가까운 방법을 몇 가지 선택하세요.',step2:'02 · 시작점 만들기',doneTitle:'MY 1%를 기록했습니다',startTitle:'시작점은 완벽할 필요가 없습니다.',savedPrefix:'기록됨: ',undefined:'아직 정하지 않음',savedLead:'. 언제든 수정할 수 있으며 실제 공유 레벨은 실제 참여로 점차 형성됩니다.',startLead:'여기서는 공유하고 싶은 방향만 기록합니다. 항목 선택만으로 레벨, XP 또는 포인트가 올라가지 않습니다.',saving:'저장 중…',saved:'저장됨 ✓',save:'나의 MY 1% 저장 →',enter:'나의 공유 홈으로 →',separator:', '}
};

export default function StartMyOne(){
  const {locale}=useI18n();const c=copy[locale];
  const [picked,setPicked]=useState<string[]>([]);
  const [status,setStatus]=useState<'idle'|'loading'|'saving'|'done'|'error'>('loading');
  const [message,setMessage]=useState('');
  const toggle=(x:string)=>setPicked(v=>v.includes(x)?v.filter(i=>i!==x):[...v,x]);

  useEffect(()=>{(async()=>{
    try{
      const s=getSupabaseBrowserClient();
      const {data:{session}}=await s.auth.getSession();
      if(!session){setStatus('idle');return;}
      const {data}=await s.from('my_one_preferences').select('share_modes').eq('user_id',session.user.id).maybeSingle();
      if(data?.share_modes) setPicked(data.share_modes);
      setStatus('idle');
    }catch{setStatus('idle')}
  })()},[]);

  async function save(){
    setMessage(''); setStatus('saving');
    try{
      const s=getSupabaseBrowserClient();
      const {data:{session}}=await s.auth.getSession();
      if(!session){setStatus('error');setMessage(c.signin);return;}
      const {error}=await s.rpc('account_save_my_one_preferences',{p_share_modes:picked});
      if(error) throw error;
      setStatus('done');
    }catch{setStatus('error');setMessage(c.failed)}
  }

  return <main className="startOnePage"><SiteHeader/>
    <section className="startHero"><div className="portalWrap"><div className="eyebrow">{c.eye}</div><h1>{c.hero}</h1><p>{c.lead}</p></div></section>
    <section className="portalSection"><div className="portalWrap startFlow"><div><small>{c.step1}</small><h2>{c.choose}</h2><div className="oneOptions">{optionValues.map((value,i)=><button type="button" key={value} onClick={()=>toggle(value)} className={picked.includes(value)?'active':''}>{c.options[i]}</button>)}</div></div>
      <div className="startSummary"><small>{c.step2}</small><h2>{status==='done'?c.doneTitle:c.startTitle}</h2><p>{status==='done'?`${c.savedPrefix}${picked.length?picked.map(x=>c.options[optionValues.indexOf(x)]||x).join(c.separator):c.undefined}${c.savedLead}`:c.startLead}</p><button className="submitLead" disabled={status==='saving'||status==='loading'} onClick={save}>{status==='saving'?c.saving:status==='done'?c.saved:c.save}</button>{message&&<p className="formNote">{message}</p>}{status==='done'&&<a className="textRoute" href="/my-1percent">{c.enter}</a>}</div>
    </div></section>
  </main>
}
