import Link from 'next/link';
import SiteHeader from '../../SiteHeader';
import { getSupabaseReadiness } from '../../../lib/supabase/readiness';

export default function DataStatusPage(){
  const state = getSupabaseReadiness();
  const rows = [
    ['資料庫網址', state.urlConfigured],
    ['公開瀏覽金鑰', state.anonKeyConfigured],
    ['伺服器管理金鑰', state.serviceRoleConfigured],
  ] as const;
  return <main className="shell">
    <SiteHeader />
    <section className="pageHero compactHero">
      <p className="eyebrow">系統狀態</p>
      <h1>目前仍使用測試資料，不會誤碰正式會員資料。</h1>
      <p className="lead">資料庫架構與權限規則已準備好；等建立 Supabase 測試環境後，再逐步啟用登入與真實資料流程。</p>
    </section>
    <section className="sectionGrid twoCol">
      <article className="glassCard">
        <span className="statusPill">{state.mode === 'prototype' ? '原型模式' : '測試環境可連線'}</span>
        <h2>連線準備</h2>
        <div className="statusList">
          {rows.map(([label,ready]) => <div className="statusRow" key={label}><span>{label}</span><strong>{ready ? '已設定' : '尚未設定'}</strong></div>)}
        </div>
      </article>
      <article className="glassCard">
        <h2>這代表什麼？</h2>
        <p>目前所有會員、企業、活動與需求畫面仍是安全的示意資料。下一階段會先接測試帳號，不會直接倒入協會真實名單。</p>
        <Link className="textLink" href="/account">返回我的入口</Link>
      </article>
    </section>
  </main>;
}
