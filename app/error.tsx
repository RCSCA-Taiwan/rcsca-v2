'use client';
import {useEffect} from 'react';
import {useI18n} from './i18n';
export default function ErrorPage({error,reset}:{error:Error&{digest?:string},reset:()=>void}){const {t}=useI18n();useEffect(()=>{console.error(error)},[error]);return <main className="systemStatePage"><section className="systemStateCard"><div className="eyebrow">RCSCA</div><h1>{t('system.errorTitle')}</h1><p>{t('system.errorLead')}</p><div className="heroActions"><button className="primary" onClick={reset}>{t('system.retry')}</button><a className="textLink" href="/">{t('system.home')} →</a></div></section></main>}
