'use client';
import {useEffect} from 'react';import FulfillmentOrders from '../../FulfillmentOrders';
import RewardCancellations from '../../RewardCancellations';
import SiteHeader from '../../SiteHeader';import {getFulfillmentClient} from '../../../lib/reward-fulfillment-api';
import {useOwnedRecords} from '../../components/useOwnedRecords';
import RedemptionWorkspaceNav from '../../components/RedemptionWorkspaceNav';import {Locale,useI18n} from '../../i18n';
type R={fulfillment_type?:string;points_expires_at?:string|null;id:string;point_cost:number;status:string;redemption_code:string|null;created_at:string;updated_at:string;reward_catalog:{title:string}|null};
const copy:Record<Locale,any>={
 'zh-Hant':{eye:'MY 1% · 共享所',title:'我的兌換與核銷進度。',lead:'只有核准時才扣除共享點；XP 與公益參與紀錄不受兌換影響。',loading:'正在讀取…',signin:'請先登入',signinLead:'登入後才能查看自己的兌換紀錄。',login:'前往登入 →',market:'共享所',fallback:'共享回饋',points:'共享點',code:'兌換碼：',empty:'目前沒有兌換紀錄。',emptyLead:'符合條件後，可從 1% 共享所送出申請。',go:'前往共享所 →',labels:{submitted:'審核中',approved:'已核准',completed:'已完成',rejected:'未通過',cancelled:'已取消'}},
 en:{eye:'MY 1% · Share Market',title:'My redemption and fulfillment progress.',lead:'Sharing Points are deducted only after approval. XP and community participation records are unaffected.',loading:'Loading…',signin:'Please sign in',signinLead:'Sign in to view your redemption history.',login:'Go to sign in →',market:'Share Market',fallback:'Sharing reward',points:'Sharing Points',code:'Redemption code: ',empty:'No redemption history yet.',emptyLead:'Once eligible, you can submit a request through the 1% Share Market.',go:'Go to Share Market →',labels:{submitted:'Under review',approved:'Approved',completed:'Completed',rejected:'Not approved',cancelled:'Cancelled'}},
 ja:{eye:'MY 1% · シェアマーケット',title:'自分の交換・利用状況。',lead:'共有ポイントは承認時にのみ差し引かれます。XPと公益参加記録には影響しません。',loading:'読み込み中…',signin:'ログインしてください',signinLead:'ログイン後に交換履歴を確認できます。',login:'ログインへ →',market:'シェアマーケット',fallback:'共有特典',points:'共有ポイント',code:'交換コード：',empty:'交換履歴はまだありません。',emptyLead:'条件を満たすと、1%シェアマーケットから申請できます。',go:'シェアマーケットへ →',labels:{submitted:'審査中',approved:'承認済み',completed:'完了',rejected:'非承認',cancelled:'取消済み'}},
 ko:{eye:'MY 1% · 공유 마켓',title:'나의 교환 및 사용 진행 상황.',lead:'공유 포인트는 승인 시에만 차감되며 XP와 공익 참여 기록에는 영향을 주지 않습니다.',loading:'불러오는 중…',signin:'로그인이 필요합니다',signinLead:'로그인 후 교환 기록을 확인할 수 있습니다.',login:'로그인으로 →',market:'공유 마켓',fallback:'공유 혜택',points:'공유 포인트',code:'교환 코드: ',empty:'아직 교환 기록이 없습니다.',emptyLead:'조건을 충족하면 1% 공유 마켓에서 신청할 수 있습니다.',go:'공유 마켓으로 →',labels:{submitted:'심사 중',approved:'승인됨',completed:'완료',rejected:'승인되지 않음',cancelled:'취소됨'}}
};
const dateLocale:Record<Locale,string>={'zh-Hant':'zh-TW',en:'en-US',ja:'ja-JP',ko:'ko-KR'};
const readCodes=(s:ReturnType<typeof getFulfillmentClient>,userId:string)=>s.from('reward_redemptions').select('id,point_cost,status,points_expires_at,fulfillment_type,redemption_code,created_at,updated_at,reward_catalog(title)').eq('user_id',userId).order('created_at',{ascending:false});
const validCode=(r:R)=>!!r&&typeof r.id==='string'&&typeof r.point_cost==='number'&&Number.isFinite(r.point_cost)&&typeof r.status==='string'&&typeof r.created_at==='string'&&(r.fulfillment_type==null||['code','service','delivery'].includes(r.fulfillment_type))&&(r.points_expires_at==null||typeof r.points_expires_at==='string')&&(r.redemption_code===null||typeof r.redemption_code==='string')&&(r.reward_catalog===null||!!r.reward_catalog&&typeof r.reward_catalog.title==='string');
const recovery={
 'zh-Hant':{failed:'目前無法確認兌換碼紀錄，請重新讀取；這不代表沒有紀錄。',retry:'重新讀取兌換碼紀錄',empty:'目前沒有兌換碼類型的紀錄。'},
 en:{failed:'Redemption code records could not be confirmed. Please reload; this does not mean there are no records.',retry:'Reload redemption code records',empty:'No code-based redemption records right now.'},
 ja:{failed:'交換コードの記録を確認できません。記録がないことを意味しません。再読み込みしてください。',retry:'交換コードを再読み込み',empty:'交換コード形式の記録はありません。'},
 ko:{failed:'교환 코드 기록을 확인하지 못했습니다. 기록이 없다는 뜻이 아닙니다. 다시 불러오세요.',retry:'교환 코드 기록 다시 불러오기',empty:'현재 코드 방식의 교환 기록이 없습니다.'}
};
export default function Redemptions(){
 const {locale}=useI18n();const c=copy[locale],message=recovery[locale];const {rows,loading,failed,userId,load}=useOwnedRecords<R>(readCodes,validCode);
 useEffect(()=>{const refresh=()=>void load();window.addEventListener('reward-cancellation-updated',refresh);return()=>window.removeEventListener('reward-cancellation-updated',refresh);},[load]);
 const codes=(rows||[]).filter(r=>!r.fulfillment_type||r.fulfillment_type==='code');
 return <main className="flowPage"><SiteHeader/><section className="flowHero"><div className="portalWrap"><div className="eyebrow">{c.eye}</div><h1>{c.title}</h1><p>{c.lead}</p></div></section><section className="portalSection"><div className="portalWrap">
 <RedemptionWorkspaceNav/>
 {userId&&<><RewardCancellations/><FulfillmentOrders/></>}
 <section className="codeRedemptions" aria-label={c.title}>
 <button className="recordsRetry" disabled={loading} onClick={()=>void load()}>{message.retry}</button>
 {loading?<p role="status">{c.loading}</p>:failed?<div className="privacyCallout" role="alert">{message.failed}</div>:!userId?<div className="privacyCallout"><strong>{c.signin}</strong><p>{c.signinLead}</p><a href="/login?next=%2Faccount%2Fredemptions">{c.login}</a></div>:codes.length?<div className="stateList">{codes.map(r=><article key={r.id}><div className="stateMeta"><small>{c.market}</small><span>{new Date(r.created_at).toLocaleDateString(dateLocale[locale])}</span></div><h3>{r.reward_catalog?.title||c.fallback}</h3><div className="stateRow"><span className={`statusChip status-${r.status}`}>{r.status==='submitted'&&r.points_expires_at&&new Date(r.points_expires_at).getTime()<=Date.now()?({'zh-Hant':'本期點數已到期，請重新申請',en:'Points expired; please submit a new request',ja:'ポイント失効。再申請してください',ko:'포인트 만료. 다시 신청해 주세요'})[locale]:c.labels[r.status]||r.status}</span><span>{r.point_cost} {c.points}</span></div>{r.redemption_code&&<p>{c.code}<strong>{r.redemption_code}</strong></p>}</article>)}</div>:<div className="privacyCallout"><strong>{message.empty}</strong><p>{c.emptyLead}</p><a href="/share-market">{c.go}</a></div>}
 </section></div></section></main>;
}
