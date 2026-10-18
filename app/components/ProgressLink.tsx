'use client';
import Link from 'next/link';
import {useI18n, type Locale} from '../i18n';

const labels:Record<Locale,string>={
 'zh-Hant':'查看我的需求與進度 →',en:'View my requests and progress →',
 ja:'自分の依頼と進捗を見る →',ko:'내 요청과 진행 상황 보기 →',
};

export default function ProgressLink(){
 const {locale}=useI18n();
 return <p><Link className="textRoute" href="/account/requests">{labels[locale]}</Link></p>;
}
