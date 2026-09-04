'use client';
import SiteHeader from '../../SiteHeader';import LiveRequests from './LiveRequests';import {Locale,useI18n} from '../../i18n';
const copy:Record<Locale,any>={
 'zh-Hant':{eye:'我的進度',title:'需求、媒合與企業案件，集中在同一個地方追蹤。',lead:'生活找人、關懷需求、工作媒合與企業 ESG 合作使用一致的狀態語言；登入後只會看到與自己相關的紀錄。',privacy:'狀態透明，不等於資料公開。',privacyLead:'私人需求內容、聯絡資料與限制性個案細節仍依權限保護。'},
 en:{eye:'My Progress',title:'Track requests, matches, and enterprise cases in one place.',lead:'Personal support, care requests, work matching, and enterprise ESG collaboration use consistent statuses. After sign-in, you only see records related to you.',privacy:'Transparent status does not mean public data.',privacyLead:'Private request details, contact information, and restricted case information remain protected by access controls.'},
 ja:{eye:'自分の進捗',title:'依頼、マッチング、企業案件を一か所で追跡。',lead:'生活支援、ケアの依頼、仕事のマッチング、企業ESG連携で共通のステータスを使用し、ログイン後は本人に関係する記録だけを表示します。',privacy:'進捗の透明性は、情報の公開を意味しません。',privacyLead:'個人的な依頼内容、連絡先、制限付き案件の詳細は権限に基づき保護されます。'},
 ko:{eye:'나의 진행',title:'요청, 매칭 및 기업 사례를 한곳에서 추적합니다.',lead:'생활 지원, 돌봄 요청, 일자리 매칭 및 기업 ESG 협력에 일관된 상태 체계를 사용하며 로그인 후 본인 관련 기록만 표시됩니다.',privacy:'진행 상태가 투명하다고 해서 정보가 공개되는 것은 아닙니다.',privacyLead:'개인 요청 내용, 연락처 및 제한된 사례 정보는 권한에 따라 보호됩니다.'}
};
export default function MyRequests(){const{locale}=useI18n();const c=copy[locale];return <main className="statePage"><SiteHeader/><section className="flowHero"><div className="portalWrap"><div className="eyebrow">{c.eye}</div><h1>{c.title}</h1><p>{c.lead}</p></div></section><section className="portalSection"><div className="portalWrap"><LiveRequests/><div className="privacyCallout"><strong>{c.privacy}</strong><p>{c.privacyLead}</p></div></div></section></main>}
