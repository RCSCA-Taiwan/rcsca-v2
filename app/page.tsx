import BrandEntrance from './BrandEntrance';

const personalFeatures = ['共享足跡','同行天數','數位共享卡','小隊','XP / Level','隱藏解鎖'];
const enterpriseFeatures = ['YOUR 1%','1% 合作標章','會員禮遇','工作機會','Impact','年度共享紀錄'];

export default function Home() {
  return <>
    <BrandEntrance />
    <main>
      <header className="nav"><div className="navInner">
        <a className="brandLockup" href="#top" aria-label="RCSCA 1% Cycle of Goodness"><b>RCSCA</b><span className="brandOne">1%</span><small>Cycle of Goodness</small></a>
        <nav><a href="#now">正在發生</a><a href="#ecosystem">1% 生態</a><a href="#pass">PASS IT ON</a><a href="#impact">共享足跡</a><a className="pill" href="#join">進入 1%</a></nav>
      </div></header>

      <section id="top" className="hero homeHero"><div className="heroInner">
        <div className="eyebrow">RCSCA · 1% · CYCLE OF GOODNESS</div>
        <h1>每個人的 <em>1%</em>，<br/>都不一樣。</h1>
        <p>1% 沒有固定形式、沒有固定單位，也不比較大小。你定義自己的 1%；RCSCA 讓不同的 1% 找到彼此，讓一次參與不只停在一次。</p>
        <div className="heroActions"><a className="primary" href="#ecosystem">找到我的 1%</a><a className="textLink" href="#one">理解 1% →</a></div>
      </div>
      <div className="cycleMark" aria-hidden="true"><div className="cycleCore">1%</div><span className="c1">參與</span><span className="c2">連結</span><span className="c3">接住</span><span className="c4">回到循環</span></div></section>

      <section id="now" className="nowBand"><div className="nowInner"><div><div className="eyebrow">HAPPENING NOW</div><h2>2026 中秋物資認購</h2><p>育幼院／弱勢家庭中秋禮盒、生活及清潔物資。認購最低需求 200 單位，持續增加中。</p></div><a href="#">查看目前行動 →</a></div></section>

      <section id="ecosystem" className="section ecosystem"><div className="sectionHead"><div><div className="eyebrow">ONE PLATFORM · DIFFERENT ROLES</div><h2>同一個循環，<br/>不是同一種參與。</h2></div><p>個人與企業各自擁有自己的 1% 入口；正式會員再解鎖更深一層的共享網絡。平台不把所有人塞進同一套玩法。</p></div>
        <div className="roleGrid">
          <article className="roleCard rolePersonal"><div className="roleNo">01</div><div className="eyebrow">INDIVIDUAL · MY 1%</div><h3>個人</h3><p>從一次參與開始，留下自己的共享足跡。時間、專業、介紹、分享、行動，都可以是你的 1%。</p><div className="featureCloud">{personalFeatures.map(x=><span key={x}>{x}</span>)}</div><a href="/prototypes/RCSCA_MY1percent_dashboard_prototype.html">探索 MY 1% →</a></article>
          <article className="roleCard roleEnterprise"><div className="roleNo">02</div><div className="eyebrow">ENTERPRISE · YOUR 1%</div><h3>企業</h3><p>產品、服務、職缺、專業、員工參與或其他資源，都能形成企業自己的 YOUR 1%，並留下可追溯的共享紀錄。</p><div className="featureCloud">{enterpriseFeatures.map(x=><span key={x}>{x}</span>)}</div><a href="/prototypes/RCSCA_YOUR1percent_enterprise_dashboard.html">探索 YOUR 1% →</a></article>
        </div>
      </section>

      <section className="memberUnlock"><div className="unlockInner"><div><div className="eyebrow">RCSCA MEMBER · UNLOCK</div><h2>加入協會，不是換一個頭銜。<br/>而是解鎖更深的連結。</h2></div><div className="unlockGrid"><div><b>生活人力網</b><span>保險、水電、設計、專業服務……在會員信任圈內找到人。</span></div><div><b>工作 × 人才</b><span>串連會員與企業端的職缺、人才與合作機會。</span></div><div><b>MEMBER 專屬</b><span>會員限定資訊、交流與未來逐步開放的功能。</span></div></div><p className="fairness">一般會員與永久會員在前台不分高低；會員價值來自「能解鎖什麼」，不是誰付得比較多。</p></div></section>

      <section id="one" className="section oneSection"><div className="bigOne">1%</div><div className="oneCopy"><div className="eyebrow">THE DEFINITION IS YOURS</div><h2>1% 沒有標準答案。</h2><p>它可以是時間、能力、資源、產品、服務、工作機會、一次介紹，或任何你願意拿出來參與的一個單位。不同人的 1%，不需要相同，也不需要等值。</p><div className="three"><div><b>不定價</b><span>不以金額決定參與價值</span></div><div><b>不比較</b><span>不把公益變成誰做得比較多</span></div><div><b>可累積</b><span>每次真實參與，都成為自己的共享足跡</span></div></div></div></section>

      <section className="progressSection"><div className="section progressInner"><div className="sectionHead"><div><div className="eyebrow">VISIBLE PROGRESS · NOT A PRICE TAG</div><h2>看得見自己的累積，<br/>但不替善意標價。</h2></div><p>積分、等級與隱藏關卡用來增加參與感與黏著度；活動以「是否參與」累積，不因認購金額高低決定分數。</p></div><div className="progressGrid"><div className="levelCard"><small>LEVEL</small><strong>共享守護者</strong><span>以持續參與與同行累積身分</span></div><div className="secretCard"><small>UNLOCKED</small><strong>1% 專屬</strong><span>達成里程碑後，解鎖限定內容與合作回饋</span></div><div className="teamCard"><small>TOGETHER</small><strong>共享小隊</strong><span>由介紹人／隊長形成凝聚力與團隊榮譽，不做上下線利益</span></div></div></div></section>

      <section id="pass" className="pass"><div><div className="eyebrow">PASS IT ON</div><h2>沒有永遠的給予者，<br/>也沒有永遠的接受者。</h2></div><div><p>制度接不到、不代表不需要被接住。RCSCA 可以評估真實缺口；而接受幫助的人、家庭或育幼院，也能在未來用自己的方式回饋 1%，重新進入循環。</p><p className="passNote">接受，不代表虧欠。回饋，也不要求等值。</p><a href="/prototypes/RCSCA_PASS_IT_ON_1percent_support_flow.html">了解 PASS IT ON →</a></div></section>

      <section className="partnerSection"><div className="section partnerInner"><div className="partnerTitle"><div className="eyebrow">1% PARTNERS</div><h2>企業提供的 1%，<br/>先回到共享。</h2><p>合作企業可以提供產品、服務或會員專屬禮遇，也可以投入公益行動；平台清楚區分「公益資源」與「會員回饋」，不把捐助包裝成遊戲獎品。</p></div><div className="partnerBadge"><span>RCSCA</span><strong>1%</strong><small>PARTNER · CYCLE OF GOODNESS</small></div></div></section>

      <section id="impact" className="impact"><div className="impactInner"><div className="eyebrow">SHARED FOOTPRINT</div><h2>一路累積的，不只是數字。</h2><div className="stats"><div><strong>4,197+</strong><span>偏鄉育幼院服務人次<br/>持續增加中</span></div><div><strong>1,273+</strong><span>弱勢家庭服務戶次<br/>持續增加中</span></div><div><strong>2018 →</strong><span>從這一年開始<br/>持續走下去</span></div></div></div></section>

      <section id="join" className="join"><div className="eyebrow">ENTER THE CYCLE</div><h2>你不需要先成為「很厲害的人」。<br/>先定義屬於你的 1%。</h2><p>個人、會員、企業、受助者、合作夥伴，都可以在不同的位置進入同一個 Cycle of Goodness。</p><div className="joinActions"><a className="primary light" href="/prototypes/RCSCA_MY1percent_signup_flow.html">我是個人</a><a className="outlineLight" href="/prototypes/RCSCA_YOUR1percent_enterprise_dashboard.html">我是企業</a></div></section>

      <footer><div className="footerBrand"><b>RCSCA</b><span>1%</span><small>Cycle of Goodness</small></div><p>社團法人中華民國共享關懷協會</p></footer>
    </main>
  </>;
}
