'use client';
import SiteHeader from '../../SiteHeader';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState} from 'react';
import {getSupabaseBrowserClient} from '../../../lib/supabase-browser';
import {useI18n,type Locale} from '../../i18n';
import './identity.css';
type IdentityState={signedIn:boolean;membership:string|null;memberSince:string|null;memberNumber:string|null;verification:string|null;enterprise:boolean};
const copy:Record<Locale,any>={
'zh-Hant':{e:'身份與使用權限',h:'查看會籍、身份驗證與可用功能。',p:'共享等級、協會會籍與使用權限是三件不同的事。正式會員身份由協會確認；共享等級仍只依參與歷程。',loading:'正在讀取身份…',current:'目前身份',guest:'一般參觀者',partner:'共享夥伴',real:'依帳號真實資料判定',signedOut:'尚未登入',verify:'身份驗證',manage:'管理驗證 →',noneVerify:'尚未提出',member:'正式會籍',none:'無',joined:'加入 ',memberNote:'一般／永久會員前台不分階級',enterprise:'企業利用資格',linked:'已連結',workspace:'可進入企業工作區',enterpriseNote:'不影響個人共享身份',memberNo:'會員編號',function:'功能',guestCol:'一般參觀者',partnerCol:'共享夥伴',foot:'一般會員與永久會員：',footText:'前台統一顯示 RCSCA會員，不形成高低階級；會費也不直接增加 XP 或共享點。',back:'回到我的入口',login:'登入查看身份',pending:'審核中',verified:'已驗證',rejected:'未通過',unverified:'未驗證',rows:[['公開公益行動','✓','✓','✓'],['MY 1%','—','✓','✓'],['共享等級／共享點','—','✓','✓'],['數位共享卡','—','✓','✓'],['小隊','—','✓','✓'],['1% 共享所','瀏覽','✓','✓'],['生活找人','—','—','✓'],['工作與人才','公開職缺','部分','✓'],['會員深層專業媒合','—','—','✓']]},
'en':{e:'Identity & Access',h:'View your membership, identity verification and available features.',p:'Sharing Level, RCSCA membership and feature access are three separate things. Formal membership is confirmed by RCSCA; Sharing Level still comes only from verified participation.',loading:'Loading identity…',current:'Current identity',guest:'Visitor',partner:'Sharing Partner',real:'Based on actual account data',signedOut:'Not signed in',verify:'Identity verification',manage:'Manage verification →',noneVerify:'Not requested',member:'Formal membership',none:'None',joined:'Joined ',memberNote:'Annual and lifetime membership are not ranked publicly',enterprise:'Organization access',linked:'Connected',workspace:'Organization workspace available',enterpriseNote:'Does not change your personal sharing identity',memberNo:'Member number',function:'Feature',guestCol:'Visitor',partnerCol:'Sharing Partner',foot:'Annual and lifetime members: ',footText:'The public interface shows both as RCSCA會員 without a hierarchy. Membership fees do not directly add XP or Sharing Points.',back:'Back to My Portal',login:'Sign in to view identity',pending:'Under review',verified:'Verified',rejected:'Not approved',unverified:'Not verified',rows:[['Public care actions','✓','✓','✓'],['MY 1%','—','✓','✓'],['Sharing Level / Points','—','✓','✓'],['Digital Sharing Card','—','✓','✓'],['Sharing Team','—','✓','✓'],['1% Sharing Market','Browse','✓','✓'],['Find trusted help','—','—','✓'],['Jobs & talent','Public jobs','Limited','✓'],['Member professional matching','—','—','✓']]},
'ja':{e:'本人情報と利用権限',h:'会員資格、本人確認、利用できる機能を確認。',p:'共有レベル、RCSCA会員資格、利用権限は別の概念です。正式会員はRCSCAが確認し、共有レベルは確認済みの参加履歴だけで決まります。',loading:'本人情報を読み込み中…',current:'現在の資格',guest:'一般閲覧者',partner:'共有パートナー',real:'実際のアカウント情報に基づく',signedOut:'未ログイン',verify:'本人確認',manage:'本人確認を管理 →',noneVerify:'未申請',member:'正式会員資格',none:'なし',joined:'加入 ',memberNote:'一般／永久会員を公開側で階級化しません',enterprise:'企業利用資格',linked:'連携済み',workspace:'企業ワークスペースを利用可能',enterpriseNote:'個人の共有資格には影響しません',memberNo:'会員番号',function:'機能',guestCol:'一般閲覧者',partnerCol:'共有パートナー',foot:'一般会員・永久会員：',footText:'公開側ではどちらもRCSCA會員と表示し、上下関係を作りません。会費もXPや共有ポイントを直接増やしません。',back:'マイページへ戻る',login:'ログインして本人情報を確認',pending:'審査中',verified:'確認済み',rejected:'未承認',unverified:'未確認',rows:[['公開ケア活動','✓','✓','✓'],['MY 1%','—','✓','✓'],['共有レベル／ポイント','—','✓','✓'],['デジタル共有カード','—','✓','✓'],['共有チーム','—','✓','✓'],['1% シェアマーケット','閲覧','✓','✓'],['生活支援を探す','—','—','✓'],['仕事・人材','公開求人','一部','✓'],['会員向け専門マッチング','—','—','✓']]},
'ko':{e:'신원 및 이용 권한',h:'회원 자격, 신원 확인 및 이용 가능한 기능을 확인하세요.',p:'공유 레벨, RCSCA 회원 자격, 기능 이용 권한은 서로 다른 개념입니다. 정식 회원 자격은 RCSCA가 확인하고 공유 레벨은 검증된 참여 이력으로만 결정됩니다.',loading:'신원 정보 불러오는 중…',current:'현재 신원',guest:'일반 방문자',partner:'공유 파트너',real:'실제 계정 데이터 기준',signedOut:'로그아웃 상태',verify:'신원 확인',manage:'신원 확인 관리 →',noneVerify:'신청하지 않음',member:'정식 회원 자격',none:'없음',joined:'가입 ',memberNote:'일반／영구 회원을 공개 화면에서 서열화하지 않습니다',enterprise:'기업 신원',linked:'연결됨',workspace:'기업 작업공간 이용 가능',enterpriseNote:'개인 공유 신원에는 영향 없음',memberNo:'회원번호',function:'기능',guestCol:'일반 방문자',partnerCol:'공유 파트너',foot:'일반 회원과 영구 회원: ',footText:'공개 화면에서는 모두 RCSCA會員로 표시하며 상하 등급을 만들지 않습니다. 회비도 XP나 공유 포인트를 직접 늘리지 않습니다.',back:'나의 페이지로',login:'로그인하여 신원 보기',pending:'검토 중',verified:'확인 완료',rejected:'승인되지 않음',unverified:'미확인',rows:[['공개 돌봄 활동','✓','✓','✓'],['MY 1%','—','✓','✓'],['공유 레벨／포인트','—','✓','✓'],['디지털 공유 카드','—','✓','✓'],['공유 팀','—','✓','✓'],['1% 공유 마켓','열람','✓','✓'],['생활 도움 찾기','—','—','✓'],['일자리와 인재','공개 채용','일부','✓'],['회원 전문 매칭','—','—','✓']]}};

const flowCopy:Record<Locale,{unknown:string;failed:string;retry:string;nav:string;apply:string;claim:string;verification:string;notifications:string;workspace:string}>={
 'zh-Hant':{unknown:'尚未確認',failed:'部分身份資料目前無法讀取，未確認的資格不會顯示為「無」。請重新讀取。',retry:'重新讀取身份',nav:'身份與申請入口',apply:'入會／續會與審核進度 →',claim:'歷年會籍認領 →',verification:'身份驗證申請與進度 →',notifications:'我的通知 →',workspace:'前往企業工作區 →'},
 en:{unknown:'Not confirmed',failed:'Some identity details could not be loaded. Unconfirmed access is not shown as absent. Please reload.',retry:'Reload identity',nav:'Identity and applications',apply:'Membership applications and reviews →',claim:'Claim historical membership →',verification:'Identity verification and progress →',notifications:'My notifications →',workspace:'Organization workspace →'},
 ja:{unknown:'未確認',failed:'一部の資格情報を読み込めませんでした。未確認の資格を「なし」とは表示しません。再読み込みしてください。',retry:'資格情報を再読み込み',nav:'資格と申請の入口',apply:'入会・更新と審査状況 →',claim:'過去の会員情報の認証 →',verification:'本人確認の申請と進捗 →',notifications:'自分の通知 →',workspace:'企業ワークスペースへ →'},
 ko:{unknown:'확인되지 않음',failed:'일부 신원 정보를 불러오지 못했습니다. 확인되지 않은 자격을 없음으로 표시하지 않습니다. 다시 불러오세요.',retry:'신원 다시 불러오기',nav:'신원 및 신청',apply:'가입·갱신 및 심사 진행 →',claim:'과거 회원 정보 연결 →',verification:'신원 확인 신청 및 진행 →',notifications:'내 알림 →',workspace:'기업 작업공간으로 →'}
};
const emptyIdentity:IdentityState={signedIn:false,membership:null,memberSince:null,memberNumber:null,verification:null,enterprise:false};
export default function Identity(){
 const {locale}=useI18n();const c=copy[locale],f=flowCopy[locale];
 const [loading,setLoading]=useState(true),[state,setState]=useState<IdentityState>(emptyIdentity),[failed,setFailed]=useState<string[]>([]),[authFailed,setAuthFailed]=useState(false);
 const request=useRef(0);
 const load=useCallback(async()=>{
  const sequence=++request.current;setLoading(true);
  try{
   const s=getSupabaseBrowserClient();
   const {data:{session},error}=await s.auth.getSession();if(error)throw error;
   if(sequence!==request.current)return;
   if(!session){setState(emptyIdentity);setFailed([]);setAuthFailed(false);return;}
   const uid=session.user.id;
   const [m,v,e]=await Promise.allSettled([
    s.from('memberships').select('membership_type,status,member_since,member_number').eq('user_id',uid).maybeSingle(),
    s.from('identity_verifications').select('status').eq('user_id',uid).order('created_at',{ascending:false}).limit(1).maybeSingle(),
    s.from('enterprise_users').select('enterprise_id').eq('user_id',uid).limit(1).maybeSingle()
   ]);
   if(sequence!==request.current)return;
   const membership=m.status==='fulfilled'&&!m.value.error?m.value.data:null;
   const verification=v.status==='fulfilled'&&!v.value.error?v.value.data:null;
   const enterprise=e.status==='fulfilled'&&!e.value.error?e.value.data:null;
   setFailed([...(m.status==='rejected'||m.value.error?['membership']:[]),...(v.status==='rejected'||v.value.error?['verification']:[]),...(e.status==='rejected'||e.value.error?['enterprise']:[])]);
   setState({signedIn:true,membership:membership?.status==='active'?membership.membership_type:null,memberSince:membership?.member_since||null,memberNumber:membership?.member_number||null,verification:verification?.status||null,enterprise:!!enterprise});
   setAuthFailed(false);
  }catch{if(sequence===request.current)setAuthFailed(true);}
  finally{if(sequence===request.current)setLoading(false);}
 },[]);
 useEffect(()=>{void load();return ()=>{request.current++;};},[load]);
 const identity=failed.includes('membership')?f.unknown:!state.signedIn?c.guest:state.membership?'RCSCA會員':c.partner;
 const verificationLabel:Record<string,string>={pending:c.pending,verified:c.verified,rejected:c.rejected,unverified:c.unverified};
 return <main className="identityPage"><SiteHeader/>
  <section className="flowHero"><div className="portalWrap"><div className="eyebrow">{c.e}</div><h1>{c.h}</h1><p>{c.p}</p></div></section>
  <section className="portalSection"><div className="portalWrap identityWorkspace" aria-busy={loading}>
   {loading?<div className="liveAccountLoading" role="status">{c.loading}</div>:<>
    {(authFailed||failed.length>0)&&<div className="workflowNotice" role="alert">{f.failed}</div>}
    <button type="button" className="identityRetry" onClick={()=>void load()}>{f.retry}</button>
    {!authFailed&&<>
     <div className="liveIdentity">
      <div><small>{c.current}</small><strong>{identity}</strong><span>{state.signedIn?c.real:c.signedOut}</span></div>
      <div><small>{c.verify}</small><strong>{failed.includes('verification')?f.unknown:state.verification?verificationLabel[state.verification]||f.unknown:c.noneVerify}</strong><span><Link href="/account/identity/verify">{c.manage}</Link></span></div>
      <div><small>{c.member}</small><strong>{failed.includes('membership')?f.unknown:state.membership?'RCSCA會員':c.none}</strong><span>{failed.includes('membership')?f.unknown:state.memberSince?`${c.joined}${state.memberSince}`:c.memberNote}</span></div>
      <div><small>{c.enterprise}</small><strong>{failed.includes('enterprise')?f.unknown:state.enterprise?c.linked:c.none}</strong><span>{failed.includes('enterprise')?f.unknown:state.enterprise?<Link href="/1percent-partner/dashboard">{f.workspace}</Link>:c.enterpriseNote}</span></div>
     </div>
     {state.memberNumber&&!failed.includes('membership')&&<div className="privacyCallout"><strong>{c.memberNo}</strong><p>{state.memberNumber}</p></div>}
    </>}
   </>}
   <nav className="identityRoutes privacyCallout" aria-label={f.nav}>
    <Link href="/membership/apply">{f.apply}</Link><Link href="/membership/claim">{f.claim}</Link>
    <Link href="/account/identity/verify">{f.verification}</Link><Link href="/account/notifications">{f.notifications}</Link>
   </nav>
   <div className="permissionMatrix"><div className="pmHead"><span>{c.function}</span><span>{c.guestCol}</span><span>{c.partnerCol}</span><span>RCSCA會員</span></div>{c.rows.map((r:string[])=><div className="pmRow" key={r[0]}>{r.map((x:string,i:number)=><span key={i}>{x}</span>)}</div>)}</div>
   <div className="identityFooter"><p><b>{c.foot}</b>{c.footText}</p>{state.signedIn?<Link className="primaryFlow" href="/account">{c.back}</Link>:<Link className="primaryFlow" href="/login?next=%2Faccount%2Fidentity">{c.login}</Link>}</div>
  </div></section>
 </main>;
}
