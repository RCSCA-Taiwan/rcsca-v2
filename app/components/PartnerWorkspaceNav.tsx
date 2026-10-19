'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useI18n,type Locale} from '../i18n';
import './partner-workspace-nav.css';

const destinations=[
 '/1percent-partner/apply','/1percent-partner/dashboard','/1percent-partner/offers',
 '/account/fulfillment','/1percent-partner/esg','/1percent-partner/requests',
 '/1percent-partner/team','/1percent-partner/impact',
] as const;
const copy:Record<Locale,{title:string;lead:string;labels:readonly string[]}>= {
 'zh-Hant':{title:'企業合作與供應',lead:'從這裡查看申請、管理供應、處理履約，或追蹤合作與成果。各項操作依帳號資格開放。',labels:['註冊／補件','合作總覽','每期供應','預約／配送履約','提出合作需求','合作需求進度','企業成員','影響力成果']},
 en:{title:'Enterprise collaboration and supply',lead:'Review applications, manage supply and fulfillment, or follow collaboration and results. Available actions depend on your account access.',labels:['Registration / corrections','Partner overview','Periodic supply','Bookings / deliveries','New collaboration request','Request progress','Enterprise members','Impact results']},
 ja:{title:'企業連携と提供',lead:'申請、提供内容、履行、連携の進捗や成果を確認できます。操作できる内容はアカウントの資格によります。',labels:['登録・追加情報','連携の概要','各期の提供','予約・配送の履行','連携を依頼','依頼の進捗','企業メンバー','活動成果']},
 ko:{title:'기업 협력 및 공급',lead:'신청, 공급, 이행, 협력 진행 및 성과를 확인하세요. 가능한 작업은 계정 권한에 따라 다릅니다.',labels:['등록·정보 보완','협력 개요','기간별 공급','예약·배송 이행','협력 요청','요청 진행','기업 구성원','활동 성과']},
};
export default function PartnerWorkspaceNav(){
 const path=usePathname();const {locale}=useI18n();const c=copy[locale];
 return <nav className="partnerWorkspaceNav" aria-label={c.title}>
  <div className="partnerWorkspaceIntro"><strong>{c.title}</strong><p>{c.lead}</p></div>
  <div className="partnerWorkspaceLinks">{destinations.map((href,index)=><Link href={href} prefetch={false} aria-current={path===href?'page':undefined} key={href}>{c.labels[index]}</Link>)}</div>
 </nav>;
}
