'use client';
import Link from 'next/link';
import {useI18n, type Locale} from '../../i18n';
import './progress-routes.css';

const routes = [
 '/membership/apply', '/membership/claim', '/1percent-partner/apply',
 '/1percent-partner/requests', '/1percent-network/matches',
 '/care-actions/verification', '/account/redemptions', '/account/data-requests',
 '/account/notifications', '/account/activity',
] as const;
const copy:Record<Locale,{title:string;lead:string;labels:string[]}> = {
 'zh-Hant':{title:'其他申請與結果紀錄',lead:'依申請類型查看審核、補件與處理結果；各流程是否可修改，以當前狀態及權限為準。',labels:['入會／續會申請','歷年會員認領','企業／團體／店家註冊與補件','企業合作案件與回覆','共享媒合與聯絡同意','活動參與與核實','兌換／預約／配送紀錄','資料異動申請','審核與進度通知','已核實的共享足跡']},
 en:{title:'Other applications and results',lead:'Follow reviews, requested information, and results by application type. Available changes depend on the current status and permissions.',labels:['Membership / renewal','Claim historical membership','Partner registration and requested information','Enterprise cases and replies','Sharing matches and contact consent','Participation and verification','Redemptions / bookings / deliveries','Personal data requests','Review and progress notifications','Verified sharing activity']},
 ja:{title:'その他の申請と結果',lead:'申請の種類ごとに審査、追加情報、結果を確認できます。変更の可否は現在の状態と権限によります。',labels:['入会／更新申請','過去の会員情報の認証','企業等の登録と追加情報','企業連携案件と返信','マッチングと連絡への同意','参加と確認','交換／予約／配送履歴','個人情報の変更申請','審査と進捗の通知','確認済みの共有履歴']},
 ko:{title:'다른 신청과 처리 결과',lead:'신청 유형별로 심사, 보완 요청 및 결과를 확인하세요. 수정 가능 여부는 현재 상태와 권한에 따라 달라집니다.',labels:['가입／갱신 신청','과거 회원 정보 연결','기업 등 등록과 정보 보완','기업 협력 사례와 답변','공유 매칭과 연락 동의','참여와 확인','교환／예약／배송 기록','개인정보 변경 신청','심사와 진행 알림','확인된 공유 활동']},
};

export default function ProgressRoutes(){
 const {locale}=useI18n();const c=copy[locale];
 return <section className="privacyCallout" aria-labelledby="other-progress-title">
  <h2 id="other-progress-title">{c.title}</h2><p>{c.lead}</p>
  <nav aria-label={c.title} className="progressRoutes">
   {routes.map((href,index)=><Link className="textRoute" href={href} key={href}>{c.labels[index]} →</Link>)}
  </nav>
 </section>;
}
