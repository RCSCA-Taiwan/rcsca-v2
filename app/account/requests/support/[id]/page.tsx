'use client';
import {use} from 'react';import SiteHeader from '../../../../SiteHeader';import LiveSupportCase from './LiveSupportCase';import {Locale,useI18n} from '../../../../i18n';
const copy:Record<Locale,any>={
 'zh-Hant':{eye:'我的關懷需求',title:'需求不是送出後就消失。',lead:'只有你與具個案權限的 RCSCA 承辦能看到案件歷程；公開頁不會顯示你的聯絡方式或完整處境。'},
 en:{eye:'My Care Request',title:'A request does not disappear after submission.',lead:'Only you and authorized RCSCA case staff can view its history. Public pages never show your contact details or full circumstances.'},
 ja:{eye:'自分のケア依頼',title:'依頼は、提出した後も見失われません。',lead:'案件履歴を確認できるのは本人と権限を持つRCSCA担当者だけです。公開ページに連絡先や詳しい事情は表示されません。'},
 ko:{eye:'나의 돌봄 요청',title:'요청은 제출 후 사라지지 않습니다.',lead:'본인과 사례 권한이 있는 RCSCA 담당자만 처리 이력을 확인할 수 있습니다. 공개 페이지에는 연락처나 전체 상황이 표시되지 않습니다.'}
};
export default function SupportCasePage({params}:{params:Promise<{id:string}>}){const {id}=use(params);const{locale}=useI18n();const c=copy[locale];return <main className="statePage"><SiteHeader/><section className="flowHero"><div className="portalWrap"><div className="eyebrow">{c.eye}</div><h1>{c.title}</h1><p>{c.lead}</p></div></section><section className="portalSection"><div className="portalWrap"><LiveSupportCase id={id}/></div></section></main>}
