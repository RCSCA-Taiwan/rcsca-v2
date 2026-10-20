'use client';
import Link from 'next/link';
import {useI18n} from '../i18n';
import '../fulfillment.css';
const copy={
 'zh-Hant':['兌換操作','查看共享所 →','我的兌換與配送 →','我的通知 →','個人中心 →'],
 en:['Redemption navigation','Share Market →','My redemptions and deliveries →','My notifications →','My account →'],
 ja:['交換の操作','シェアマーケットへ →','自分の交換と配送 →','自分の通知 →','マイアカウント →'],
 ko:['교환 메뉴','공유 마켓 →','내 교환 및 배송 →','내 알림 →','내 계정 →']
};
export default function RedemptionWorkspaceNav(){const {locale}=useI18n();const c=copy[locale];return <nav className="redemptionWorkspaceNav" aria-label={c[0]}>{['/share-market','/account/redemptions','/account/notifications','/account'].map((href,i)=><Link key={href} href={href} prefetch={false}>{c[i+1]}</Link>)}</nav>;}
