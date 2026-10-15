'use client';
import {useEffect} from 'react';
import type {PointsWallet} from '../lib/points';
import {useI18n} from './i18n';
import './points-expiry.css';

const copy = {
  'zh-Hant': {available:'目前可用共享點',expiry:'本期點數可使用至',remaining:'剩餘',days:'天',soon:'即將到期，請留意兌換審核所需時間。',pending:'正式入會日期待協會確認；目前點數保留，到期日待確認。',before:'入會前點數保留；正式入會後，依入會日計算一年效期。',rule:'每年依入會週年更新，期末未使用點數到期；XP 與共享足跡持續保留。',failed:'目前無法確認積分與到期日。',retry:'重新讀取'},
  en:{available:'Available Sharing Points',expiry:'Use this period’s points by',remaining:'Remaining',days:'days',soon:'Expiring soon. Allow time for redemption approval.',pending:'Admission date awaits confirmation. Your points are retained; expiry is not yet confirmed.',before:'Pre-membership points are retained. A one-year period begins on formal admission.',rule:'Periods renew on your admission anniversary. Unused points expire; XP and footprints remain.',failed:'Points and expiry could not be confirmed.',retry:'Retry'},
  ja:{available:'利用可能な共有ポイント',expiry:'今期ポイントの利用期限',remaining:'残り',days:'日',soon:'まもなく期限です。交換審査に必要な時間にご注意ください。',pending:'正式入会日は確認待ちです。ポイントは保持され、期限は未確定です。',before:'入会前のポイントは保持されます。正式入会日から1年間有効です。',rule:'入会記念日に毎年更新。未使用ポイントは失効し、XPと共有の足跡は保持されます。',failed:'ポイントと期限を確認できません。',retry:'再読み込み'},
  ko:{available:'사용 가능한 공유 포인트',expiry:'이번 기간 포인트 사용 기한',remaining:'남은 기간',days:'일',soon:'곧 만료됩니다. 교환 승인에 필요한 시간을 고려해 주세요.',pending:'정식 가입일 확인 대기 중입니다. 포인트는 유지되며 만료일은 아직 미정입니다.',before:'가입 전 포인트는 유지됩니다. 정식 가입일부터 1년간 유효합니다.',rule:'매년 가입 기념일에 갱신됩니다. 미사용 포인트는 만료되며 XP와 공유 발자취는 유지됩니다.',failed:'포인트와 만료일을 확인할 수 없습니다.',retry:'다시 불러오기'}
};
export default function PointsExpiry({wallet,showBalance=false,onRetry}:{wallet:PointsWallet|null;showBalance?:boolean;onRetry?:()=>void}) {
  const {locale}=useI18n();const c=copy[locale];
  useEffect(()=>{
    if(!wallet||!onRetry)return;
    const now=Date.now(),day=86400000,offset=8*3600000;
    const nextMidnight=(Math.floor((now+offset)/day)+1)*day-offset;
    const deadline=wallet.expires_at?new Date(wallet.expires_at).getTime():nextMidnight;
    const timer=setTimeout(onRetry,Math.max(50,Math.min(nextMidnight,deadline)-now+50));
    return()=>clearTimeout(timer);
  },[wallet,onRetry]);
  if (!wallet) return <div className="pointsExpiry" role="alert"><p>{c.failed}</p>{onRetry&&<button onClick={onRetry}>{c.retry}</button>}</div>;
  return <div className={`pointsExpiry ${wallet.days_left!==null&&wallet.days_left<=30?'isSoon':''}`}>
    {showBalance&&<div className="pointsAvailable"><span>{c.available}</span><strong>{wallet.balance.toLocaleString(locale)}</strong></div>}
    {wallet.expires_on ? <><p>{c.expiry} <time dateTime={wallet.expires_on}>{wallet.expires_on.replaceAll('-','/')}</time>（台灣時間）</p><p>{c.remaining} <b>{wallet.days_left}</b> {c.days}</p>{wallet.days_left!==null&&wallet.days_left<=30&&wallet.balance>0&&<p role="status">{c.soon}</p>}<small>{c.rule}</small></> : <p>{wallet.status==='before_membership'?c.before:c.pending}</p>}
  </div>;
}
