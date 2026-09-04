'use client';
import SiteHeader from '../SiteHeader';
import Link from 'next/link';
import LiveAccount from './LiveAccount';
import LiveCycleSummary from './LiveCycleSummary';
import {Locale,useI18n} from '../i18n';

const cardBase=[
 ['/account/profile','account.profile'],['/account/security','account.security'],['/account/identity','account.identity'],['/account/identity/verify','account.verify'],['/account/activity','account.activity'],['/my-1percent','MY 1%'],['/share-market','account.market'],['/team','account.team'],['/account/referral','account.referral'],['/member-network','account.memberNetwork'],['/account/notifications','account.notifications'],['/account/requests','account.requests']
] as const;
const copy:Record<Locale,string[][]>={
 'zh-Hant':[
  ['基本資料','管理顯示名稱與必要聯絡資料。','管理 →'],['安全','管理登入 Email 與密碼，不影響會員身份。','管理 →'],['身份','依真實帳號資料顯示共享夥伴、正式會員與驗證狀態。','查看 →'],['驗證','提出或查看自己的身份驗證進度。','管理 →'],['紀錄','查看已核實參與、連結與共享足跡。','查看 →'],['個人','共享足跡、等級、卡片、小隊與解鎖。','進入 →'],['回饋','用共享點查看可兌換的企業與夥伴 1%。','進入 →'],['小隊','查看團隊足跡、里程碑與介紹來源。','進入 →'],['來源','查看加入時已確認的介紹人與小隊來源。','查看 →'],['正式會員','生活找人、工作與人才。','查看 →'],['通知','核實、媒合、小隊與權限的重要更新。','查看 →'],['進度','查看媒合、工作、公益參與等目前走到哪一步。','查看 →']
 ],
 'en':[
  ['Profile','Manage display name and necessary contact information.','Manage →'],['Security','Manage sign-in email and password without changing membership identity.','Manage →'],['Identity','See Sharing Partner, formal member, and verification status from real account data.','View →'],['Verification','Submit or review your identity-verification progress.','Manage →'],['History','View verified participation, connections, and Sharing Footprints.','View →'],['Personal','Sharing Footprints, level, card, team, and unlocks.','Enter →'],['Rewards','Use Sharing Points to view redeemable partner contributions.','Enter →'],['Team','View team footprints, milestones, and referral source.','Enter →'],['Source','View the confirmed referrer and team source from when you joined.','View →'],['Formal member','Find trusted people, jobs, and talent.','View →'],['Notifications','Important verification, matching, team, and permission updates.','View →'],['Progress','Track matching, work, and community-care participation.','View →']
 ],
 'ja':[
  ['基本情報','表示名と必要な連絡情報を管理します。','管理 →'],['セキュリティ','ログイン用メールとパスワードを管理します。会員資格には影響しません。','管理 →'],['身份','実際のアカウント情報から共有パートナー、正式会員、確認状況を表示します。','見る →'],['本人確認','本人確認の申請または進捗を確認します。','管理 →'],['記録','確認済みの参加、つながり、共有の足跡を確認します。','見る →'],['個人','共有の足跡、レベル、カード、チーム、解放項目。','入る →'],['リワード','共有ポイントで交換可能なパートナーの1%を確認します。','入る →'],['チーム','チームの足跡、節目、紹介元を確認します。','入る →'],['紹介元','参加時に確認された紹介者とチームの紹介元を確認します。','見る →'],['正式会員','生活の専門家、仕事、人材を探します。','見る →'],['通知','確認、マッチング、チーム、権限の重要な更新。','見る →'],['進捗','マッチング、仕事、公益参加の現在地を確認します。','見る →']
 ],
 'ko':[
  ['기본 정보','표시 이름과 필요한 연락처를 관리합니다.','관리 →'],['보안','로그인 이메일과 비밀번호를 관리하며 회원 자격에는 영향을 주지 않습니다.','관리 →'],['신원','실제 계정 데이터로 공유 파트너, 정식 회원 및 확인 상태를 표시합니다.','보기 →'],['신원 확인','본인의 신원 확인을 신청하거나 진행 상황을 봅니다.','관리 →'],['기록','확인된 참여, 연결과 공유 발자취를 확인합니다.','보기 →'],['개인','공유 발자취, 레벨, 카드, 팀과 해제 항목.','입장 →'],['리워드','공유 포인트로 교환 가능한 파트너의 1%를 확인합니다.','입장 →'],['팀','팀 발자취, 이정표와 소개 경로를 확인합니다.','입장 →'],['소개 경로','가입할 때 확인된 소개자와 팀 출처를 확인합니다.','보기 →'],['정식 회원','생활 전문가, 일자리와 인재를 찾습니다.','보기 →'],['알림','확인, 매칭, 팀과 권한의 중요한 업데이트.','보기 →'],['진행','매칭, 일자리, 공익 참여의 현재 단계를 확인합니다.','보기 →']
 ]
};

export default function Account(){const {t,locale}=useI18n();const cards=copy[locale];return <main className="accountPage"><SiteHeader/><section className="accountHero"><div className="portalWrap"><div className="eyebrow">{t('account.eyebrow')}</div><h1>{t('account.title')}</h1><p>{t('account.lead')}</p></div></section><section className="portalSection"><div className="portalWrap"><LiveAccount/><LiveCycleSummary/><div className="accountGrid">{cardBase.map(([href,title],i)=><Link href={href} key={href}><small>{cards[i][0]}</small><h3>{title==='MY 1%'?'MY 1%':t(title)}</h3><p>{cards[i][1]}</p><span>{cards[i][2]}</span></Link>)}</div></div></section></main>}
