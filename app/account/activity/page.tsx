'use client';
import SiteHeader from '../../SiteHeader';
import LiveActivity from './LiveActivity';
import {Locale,useI18n} from '../../i18n';

const copy:Record<Locale,{eye:string;title:string;lead:string}>={
 'zh-Hant':{eye:'我的共享紀錄',title:'每一次真實參與，都留下可回看的足跡。',lead:'這裡只顯示登入者自己的已核實紀錄；金額不是共享等級的判斷依據。'},
 'en':{eye:'My Sharing Activity',title:'Every genuine participation leaves a footprint you can revisit.',lead:'Only your own verified records appear here. Contribution amounts do not determine your Sharing Level.'},
 'ja':{eye:'自分の共有履歴',title:'一つひとつの確かな参加が、振り返れる足跡になります。',lead:'ここにはログイン中の本人の確認済み記録だけを表示します。金額は共有レベルの判断基準ではありません。'},
 'ko':{eye:'나의 공유 기록',title:'진정성 있는 모든 참여는 다시 확인할 수 있는 발자취로 남습니다.',lead:'로그인한 본인의 확인 완료 기록만 표시합니다. 금액은 공유 레벨의 판단 기준이 아닙니다.'}
};

export default function Activity(){const {locale}=useI18n();const c=copy[locale];return <main><SiteHeader/><section className="accountHero"><div className="portalWrap"><div className="eyebrow">{c.eye}</div><h1>{c.title}</h1><p>{c.lead}</p></div></section><section className="portalSection"><div className="portalWrap"><LiveActivity/></div></section></main>}
