const modules = [
  ['PUBLIC', '1% × Cycle of Goodness', '/prototypes/RCSCA_1percent_Cycle_of_Goodness_V2_prototype.html'],
  ['JOIN', '加入 MY 1%', '/prototypes/RCSCA_MY1percent_signup_flow.html'],
  ['PERSONAL', 'MY 1% 個人中心', '/prototypes/RCSCA_MY1percent_dashboard_prototype.html'],
  ['SHARE', '1% 共享所', '/prototypes/RCSCA_1percent_rewards_and_levels.html'],
  ['MEMBER', '1% 人力資源網', '/prototypes/RCSCA_MEMBER_1percent_HR_network.html'],
  ['ENTERPRISE', 'YOUR 1% 企業端', '/prototypes/RCSCA_YOUR1percent_enterprise_dashboard.html'],
  ['PASS IT ON', '1% 接住計畫', '/prototypes/RCSCA_PASS_IT_ON_1percent_support_flow.html'],
  ['ADMIN', 'RCSCA 後台', '/prototypes/RCSCA_ADMIN_1percent_operations.html'],
];

export default function Home() {
  return <main className="wrap">
    <section className="hero">
      <div className="eyebrow">RCSCA V2 · STARTER</div>
      <h1>1%<br/>Cycle of Goodness</h1>
      <p>這是 RCSCA V2 的第一個正式程式碼專案骨架。現有原型先保留在 public/prototypes，後續逐頁改寫成真正連接資料庫、登入與權限的 Next.js 功能。</p>
    </section>
    <section className="notice"><b>目前狀態：Prototype → Engineering Starter</b><p>這不是正式上線版；Supabase、OTP、RLS、企業資料與 PASS IT ON 個案資料目前尚未接入。</p></section>
    <section className="grid">
      {modules.map(([tag,title,href]) => <a className="card" href={href} key={href}>
        <div className="eyebrow">{tag}</div><h2>{title}</h2><p>查看已完成的視覺／流程原型。</p><span>開啟原型 →</span>
      </a>)}
    </section>
  </main>;
}
