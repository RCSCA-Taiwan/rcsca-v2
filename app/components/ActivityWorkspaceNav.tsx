'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useI18n,type Locale} from '../i18n';
import './activity-workspace.css';
const routes=['/care-actions','/care-actions/participate','/care-actions/verification','/account/activity'] as const;
const copy:Record<Locale,{title:string;labels:string[]}>= {
 'zh-Hant':{title:'活動參與操作',labels:['查看公益活動','登記參與','查看核實狀態','我的登記與共享足跡']},
 en:{title:'Activity participation',labels:['Community activities','Register participation','Verification status','My registrations and footprints']},
 ja:{title:'活動参加の操作',labels:['公益活動を見る','参加登録','確認状況を見る','自分の登録と共有の足跡']},
 ko:{title:'활동 참여',labels:['공익 활동 보기','참여 등록','확인 상태 보기','나의 등록과 공유 발자취']}
};
export default function ActivityWorkspaceNav(){const path=usePathname(),{locale}=useI18n(),c=copy[locale];return <nav className="activityWorkspaceNav" aria-label={c.title}>{routes.map((href,i)=><Link key={href} href={href} prefetch={false} aria-current={path===href?'page':undefined}>{c.labels[i]} →</Link>)}</nav>;}
