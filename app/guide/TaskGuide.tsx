"use client";
import {useEffect,useRef,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import Link from 'next/link';
import FriendlyIcon,{type IconName} from '../components/FriendlyIcon';
import WelcomeGarden from '../components/WelcomeGarden';
import {ADMIN_WORKSPACES,PAGE_NAMES} from '../../lib/site-navigation.mjs';
const baseGroups: {id:string;title:string;icon:IconName;lead:string;items:[string,string,string][]}[]=[
 {id:'start',title:'第一次來，從這裡開始',icon:'sprout',lead:'註冊帳號後，再依需要申請會籍或合作資格。',items:[['/register','個人註冊','建立個人帳號，驗證 Email 後開始參與。'],['/register?type=enterprise','企業／團體／店家 共享合作夥伴註冊','先驗證 Email，再填寫組織資料與可分享的 1%。'],['/login','已有帳號，登入','使用原本帳號登入，不必重新註冊。'],['/membership/claim','認領歷年會員資料','註冊驗證後連結舊會籍，保留入會日期及年資。'],['/membership/apply','申請入會／舊會員續會','選擇新入會或續會，填寫資料並送交審核。']]},
 {id:'care',title:'一起陪伴，分享一點溫暖',icon:'heart',lead:'依目前開放的活動與需求，找到適合自己的參與方式。',items:[['/care-actions','查看關懷活動與需求','尋找育幼院關懷、服務與參與資訊。'],['/my-1percent/start','分享我的 1%','了解如何提供時間、專業或資源。'],['/1percent-network/directory','尋找共享專業夥伴','依產業細項與地區尋找公開的專業資源。'],['/1percent-network/join','登錄我的專業服務','填寫專業分類與公開介紹，送交審核。'],['/community','每日積分任務與互動論壇','主題每日一篇，核准 +2 分；回覆不同主題各 +1 分。']]},
 {id:'account',title:'我的資料、積分與紀錄',icon:'people',lead:'需要登入的功能，會先帶你登入，再回到原本要去的頁面。',items:[['/account','開啟個人中心','集中查看帳號、會籍與常用功能。'],['/my-1percent','查看積分與到期提醒','查看目前積分、累積紀錄及效期。'],['/share-market','瀏覽共享所與兌換','查看可兌換的產品、服務及使用條件。'],['/account/redemptions','查看兌換／預約／配送與取消','追蹤訂單，依規則申請取消與退點。'],['/account/profile','修改基本資料與生日','維護生日及祝賀意願，查看身分、入會日期與年資。'],['/account/data-requests','申請資料修改／重置／刪除','需審核的異動由此提出；重置有兩次確認。'],['/account/contributions','查看我的捐款貢獻紀錄','查看已登錄的捐款與貢獻紀錄。'],['/membership/directory','查看年度會員名冊','依權限查看當年度會籍與入會資訊。'],['/account/referral','查看介紹人與小隊來源','查看已確認的介紹來源。'],['/team','查看我的小隊','查看小隊參與與共享足跡。']]},
 {id:'partner',title:'合作夥伴專區',icon:'shop',lead:'組織申請與個人會籍分別審核，申請送出後可查看目前狀態。',items:[['/1percent-partner/offers','管理每期產品／服務供應','建立每月供應、上傳圖片、查看審核與申請下架。'],['/1percent-partner/apply','填寫／補正合作夥伴申請','填寫名稱、統編、產業、窗口及 1% 產品或服務。'],['/1percent-partner/dashboard','開啟合作夥伴工作台','查看申請狀態與可使用的共享功能。'],['/1percent-partner/requests','查看合作服務需求','追蹤組織服務需求與處理進度。'],['/1percent-partner/impact','查看共享成果','查看已核實的共享紀錄與成果。'],['/1percent-partner/esg','提出企業合作需求','說明專案目的與需求，進行後續合作評估。']]},
 {id:'admin',title:'管理員工作入口',icon:'shield',lead:'僅具對應管理權限者可操作；此處不會授予任何權限。',items:[['/admin','管理員首頁','集中查看管理工作。'],['/admin/members','會員申請與名冊管理','審核入會、續會與會籍資料。'],['/admin/members/legacy','歷年未註冊名冊與認領','先匯入名冊，再獨立核對會員認領。'],['/admin/members/birthdays','會員生日祝賀名單','按月份查看有效且同意祝賀的會員。'],['/admin/members/import','匯入既有會員年度名冊','下載 CSV 範本、預覽檢查，再確認登錄。'],['/admin/partners','合作夥伴申請審核','查看組織資料與待補件申請。'],['/admin/network','共享專業網絡審核','管理公開的專業服務資料。'],['/admin/rewards','共享所與取消審核','管理兌換項目、預約配送與取消退點。'],['/admin/members/data-requests','會員資料異動審核','處理修改、重置與刪除申請。'],['/admin/contributions','認購名單批次貼上與捐款核實','貼上姓名與單位，先存認購；核實收款及配對後累積貢獻。'],['/admin/community','交流內容與圖片審核','審核討論與公開圖片。'],['/admin/operations','操作稽核紀錄','依權限核對管理操作紀錄。']]}
];
const moreGroups:typeof baseGroups=[
 {id:'connect',title:'找專業、工作與人才',icon:'network',lead:'從提出需求、回應意願到查看媒合進度，依會員與合作資格使用。',items:[['/member-network','會員專屬網絡總覽','了解生活服務、工作與人才的使用入口。'],['/member-network/request','提出生活與專業需求','說明需要的服務、地區與條件，送交評估媒合。'],['/member-network/jobs','查看工作機會與回應意願','查看開放的工作需求，再由本人選擇是否回應。'],['/member-network/talent-request','提出人才需求','填寫工作內容、條件與合作方式。'],['/1percent-network/matches','查看專業媒合進度','追蹤需求回應及雙方確認的後續進度。']]},
 {id:'actions',title:'參與活動與查看成果',icon:'heart',lead:'先找到活動或提出需求，完成後回到自己的紀錄查看處理結果。',items:[['/care-actions/participate','登記參與關懷活動','選擇開放活動，填寫參與資訊與交付方式。'],['/care-actions/request','提出需要協助的關懷需求','提供必要說明，交由協會依權限處理。'],['/care-actions/archive','查看歷年行動紀錄','了解協會歷年的關懷行動。'],['/care-actions/impact','查看關懷成果','查看可公開的服務與參與成果。'],['/cycle-of-goodness/cases','查看善循環案例','了解參與、資源連結與角色轉換的案例。']]},
 {id:'about',title:'認識協會與使用規則',icon:'clipboard',lead:'了解協會、共享機制，以及參與和資料使用方式。',items:[['/about','認識 RCSCA','了解協會理念與發展。'],['/cycle-of-goodness','了解善循環','了解個人、企業、關懷與連結如何持續流動。'],['/governance','查看協會治理資訊','了解治理原則與組織資訊。'],['/sharing-rules','查看共享點與參與規則','確認目前的累積、兌換與效期規則。'],['/privacy','查看隱私權政策','了解個人資料的使用與保護。'],['/terms','查看使用條款','確認網站使用與參與規範。'],['/contact','聯絡協會','找到需要協助時的聯絡方式。']]}
];
const groups=[...baseGroups.slice(0,2),...moreGroups.slice(0,2),...baseGroups.slice(2),moreGroups[2]].map(group=>{
 if(group.id==='admin'){
  const existing=new Set(group.items.map(([href])=>href));
  const missing=ADMIN_WORKSPACES.flatMap(workspace=>workspace.items).filter(([href])=>href.startsWith('/admin/')&&!existing.has(href)).map(([href,description]):[string,string,string]=>[href,PAGE_NAMES[href],description]);
  return {...group,items:[['/admin/operations','後台完整工作總覽','依會員、活動、企業、共享所、交流與營運工作前往。'] as [string,string,string],...group.items.filter(([href])=>href!=='/admin/operations'),...missing]};
 }
 if(group.id==='account')return {...group,items:[...group.items,...([
  ['/account/requests','追蹤我的申請進度','查看申請目前的狀態與下一步。'],['/account/notifications','查看我的通知','查看審核、媒合與參與相關通知。'],['/account/security','管理登入與帳號安全','管理登入信箱及密碼。'],['/account/fulfillment','開啟供應方履約工作台','具供應管理資格者處理預約、出貨與完成確認。']
 ] as [string,string,string][])]};
 return group;
});
function validCategory(value:string|null){return groups.some(g=>g.id===value)?value!:'all';}
export default function TaskGuide(){
 const searchParams=useSearchParams(),signature=searchParams.toString();
 const [query,setQuery]=useState(searchParams.get('q')||''),[group,setGroup]=useState(()=>validCategory(searchParams.get('category')));
 const synchronized=useRef(signature);
 useEffect(()=>{
  if(signature===synchronized.current)return;
  synchronized.current=signature;
  setQuery(searchParams.get('q')||'');setGroup(validCategory(searchParams.get('category')));
 },[signature,searchParams]);
 function update(nextQuery:string,nextGroup:string){
  const params=new URLSearchParams();
  if(nextQuery)params.set('q',nextQuery);
  if(nextGroup!=='all')params.set('category',nextGroup);
  const value=params.toString();
  synchronized.current=value;setQuery(nextQuery);setGroup(nextGroup);
  window.history.replaceState(null,'',`/guide${value?'?'+value:''}${window.location.hash}`);
 }
const q=query.trim().toLocaleLowerCase();const visible=groups.filter(g=>group==='all'||g.id===group).map(g=>({...g,items:g.items.filter(item=>!q||[g.title,g.lead,...item.slice(1)].join(' ').toLocaleLowerCase().includes(q))})).filter(g=>g.items.length);const count=visible.reduce((sum,g)=>sum+g.items.length,0);
return <><section className="guideHero"><div className="portalWrap guideHeroInner"><div><div className="eyebrow">LET’S SHARE A LITTLE</div><h1>想做什麼？<br/>從這裡找到入口。</h1><p>加入、參與、查進度，讓每一份心意都有清楚的下一步。</p></div><WelcomeGarden/></div></section><section className="portalSection guideBody"><div className="portalWrap"><div className="guideSearch"><FriendlyIcon name="search"/><label htmlFor="task-search">搜尋功能或想做的事<input id="task-search" type="search" placeholder="例如：註冊、積分、預約、修改資料" value={query} onChange={e=>update(e.target.value,group)}/></label>{query&&<button type="button" onClick={()=>update('',group)}>清除搜尋</button>}</div><div className="guideFilters" role="group" aria-label="功能分類"><button type="button" aria-pressed={group==='all'} onClick={()=>update(query,'all')}>全部功能</button>{groups.map(g=><button key={g.id} type="button" aria-pressed={group===g.id} onClick={()=>update(query,g.id)}>{g.title}</button>)}</div><p className="guideCount" role="status">找到 {count} 個入口</p>{visible.length?visible.map(g=><section key={g.id} className="guideGroup" aria-labelledby={`guide-${g.id}`}><div className="guideGroupHeading"><FriendlyIcon name={g.icon}/><div><h2 id={`guide-${g.id}`}>{g.title}</h2><p>{g.lead}</p></div></div><div className="guideGrid">{g.items.map(([href,title,desc])=><Link href={href} key={href} className="guideCard"><h3>{title}<FriendlyIcon name="arrow"/></h3><p>{desc}</p></Link>)}</div></section>):<div className="guideEmpty"><FriendlyIcon name="search"/><h2>還沒找到符合的功能</h2><p>試試「會員」「共享」「資料」等關鍵字，或顯示全部入口。</p><button type="button" onClick={()=>update('','all')}>顯示全部入口</button></div>}<p className="guideHelp">還需要協助？<Link href="/contact">聯絡協會 →</Link></p></div></section></>}
