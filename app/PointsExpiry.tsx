'use client';
import {useEffect} from 'react';
import type {PointsWallet} from '../lib/points';
import {useI18n} from './i18n';
import './points-expiry.css';

const copy = {
  'zh-Hant': {available:'目前可用共享點',expiry:'本期點數可使用至',remaining:'剩餘',days:'天',soon:'即將到期，請留意兌換審核所需時間。',pending:'正式入會日期待協會確認；目前點數保留，到期日待確認。',before:'入會前點數保留；正式會籍啟用後仍依每曆年 1/1–12/31 的年度制計算與到期。',rule:'共享點以每曆年 1/1–12/31 為一期，年度結束未使用點數到期；XP 與共享足跡持續保留。',failed:'目前無法確認積分與到期日。',retry:'重新讀取'},
  en:{available:'Available Sharing Points',expiry:'Use this period’s points by',remaining:'Remaining',days:'days',soon:'Expiring soon. Allow time for redemption approval.',pending:'Admission date awaits confirmation. Your points are retained; expiry is not yet confirmed.',before:'Pre-membership points are retained. Once membership is active, points still follow the calendar-year cycle from Jan 1 through Dec 31.',rule:'Sharing Points run on a calendar-year cycle from Jan 1 through Dec 31. Unused points expire at year-end; XP and footprints remain.',failed:'Points and expiry could not be confirmed.',retry:'Retry'},
  ja:{available:'利用可能な共有ポイント',expiry:'今期ポイントの利用期限',remaining:'残り',days:'日',soon:'まもなく期限です。交換審査に必要な時間にご注意ください。',pending:'正式入会日は確認待ちです。ポイントは保持され、期限は未確定です。',before:'入会前のポイントは保持されます。正式会員資格の有効化後も、ポイントは毎年1月1日〜12月31日の暦年制で計算・失効します。',rule:'共有ポイントは毎年1月1日〜12月31日を1期間とし、年末時点の未使用ポイントは失効します。XPと共有の足跡は引き続き保持されます。',failed:'ポイントと期限を確認できません。',retry:'再読み込み'},
  ko:{available:'사용 가능한 공유 포인트',expiry:'이번 기간 포인트 사용 기한',remaining:'남은 기간',days:'일',soon:'곧 만료됩니다. 교환 승인에 필요한 시간을 고려해 주세요.',pending:'정식 가입일 확인 대기 중입니다. 포인트는 유지되며 만료일은 아직 미정입니다.',before:'가입 전 포인트는 유지됩니다. 정식 회원 자격이 활성화된 뒤에도 포인트는 매년 1월 1일~12월 31일의 연간 주기로 계산되고 만료됩니다.',rule:'공유 포인트는 매년 1월 1일~12월 31일을 한 주기로 하며, 연말까지 사용하지 않은 포인트는 만료됩니다. XP와 공유 발자취는 계속 유지됩니다.',failed:'포인트와 만료일을 확인할 수 없습니다.',retry:'다시 불러오기'}
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
    {!!wallet.reserved_points&&<p>另有 {wallet.reserved_points.toLocaleString(locale)} 點暫時保留於待確認預約，未扣除；上方為扣除保留後的可用餘額。</p>}
    {wallet.expires_on ? <><p>{c.expiry} <time dateTime={wallet.expires_on}>{wallet.expires_on.replaceAll('-','/')}</time>（台灣時間）</p><p>{c.remaining} <b>{wallet.days_left}</b> {c.days}</p>{wallet.days_left!==null&&wallet.days_left<=30&&wallet.balance>0&&<p role="status">{c.soon}</p>}<small>{c.rule}</small></> : <p>{wallet.status==='before_membership'?c.before:c.pending}</p>}
  </div>;
}
