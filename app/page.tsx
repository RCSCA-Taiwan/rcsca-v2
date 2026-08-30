const actions = [
  { tag: 'NOW', title: '2026 中秋物資認購', text: '育幼院與弱勢家庭中秋禮盒、生活及清潔物資。認購最低需求 200 單位，持續增加中。', cta: '了解目前行動' },
  { tag: 'MY 1%', title: '留下你的 1%', text: '參與不是比金額。每一次行動、分享與陪伴，都會成為自己的善循環紀錄。', cta: '認識 MY 1%' },
  { tag: 'PASS IT ON', title: '讓受助者也能成為給予者', text: '接受幫助不是終點。任何人都能用自己做得到的 1%，把善意繼續傳下去。', cta: '認識 PASS IT ON' },
]

export default function Home() {
  return <main>
    <header className="nav"><div className="navInner"><div className="brand"><b>RCSCA</b><span>共享關懷協會</span></div><nav><a href="#action">正在發生</a><a href="#one">1%</a><a href="#impact">我們做過的事</a><a className="pill" href="/prototypes/RCSCA_MY1percent_signup_flow.html">加入 MY 1%</a></nav></div></header>

    <section className="hero homeHero"><div className="heroInner"><div className="eyebrow">RCSCA · CYCLE OF GOODNESS</div><h1><em>1%</em><br/>一點點善意，<br/>讓善循環。</h1><p>不需要一個人做很多。每個人願意分享一點時間、一點能力、一點資源，就能讓下一個人被接住。</p><div className="heroActions"><a className="primary" href="#action">參與現在的行動</a><a className="textLink" href="#one">1% 是什麼 →</a></div></div><div className="orbit" aria-hidden="true"><span className="one">1%</span><span className="o1">分享</span><span className="o2">參與</span><span className="o3">接住</span><span className="o4">再傳下去</span></div></section>

    <section id="action" className="section"><div className="sectionHead"><div><div className="eyebrow">HAPPENING NOW</div><h2>現在，可以一起做的事。</h2></div><p>公益不是等到有空、有錢才開始。先從眼前的一件事開始。</p></div><div className="actionGrid">{actions.map((a,i)=><article className={`actionCard ${i===0?'featured':''}`} key={a.tag}><div className="eyebrow">{a.tag}</div><h3>{a.title}</h3><p>{a.text}</p><a href={i===1?'/prototypes/RCSCA_MY1percent_dashboard_prototype.html':i===2?'/prototypes/RCSCA_PASS_IT_ON_1percent_support_flow.html':'#'}>{a.cta} →</a></article>)}</div></section>

    <section id="impact" className="impact"><div className="eyebrow">WHAT WE HAVE DONE</div><h2>不是一次活動，<br/>而是一路累積的同行。</h2><div className="stats"><div><strong>9</strong><span>年持續行動<br/>正走向第 10 年</span></div><div><strong>近 2,000</strong><span>人次<br/>偏鄉與育幼院兒童</span></div><div><strong>持續</strong><span>把資源送到<br/>真正需要的地方</span></div></div><p className="sourceNote">成果數字以協會正式紀錄為準，後續由後台維護更新。</p></section>

    <section id="one" className="section oneSection"><div className="bigOne">1%</div><div className="oneCopy"><div className="eyebrow">CYCLE OF GOODNESS</div><h2>我們不想把公益<br/>做成少數人的負擔。</h2><p>1% 不是捐款比例，也不是用金額衡量誰比較有愛心。它是一個很簡單的約定：每個人用自己做得到的一點點，加入同一個循環。</p><div className="three"><div><b>參與</b><span>每次行動都留下紀錄</span></div><div><b>連結</b><span>人、企業與需求彼此找到</span></div><div><b>傳遞</b><span>被接住的人也能回饋自己的 1%</span></div></div></div></section>

    <section className="pass"><div><div className="eyebrow">PASS IT ON</div><h2>今天被接住的人，<br/>明天也可以接住別人。</h2></div><div><p>我們想打破「施與受」的單向關係。真正的善循環，不是讓一個人永遠站在接受的一端，而是保留他的尊嚴、能力與選擇。</p><a href="/prototypes/RCSCA_PASS_IT_ON_1percent_support_flow.html">了解 PASS IT ON →</a></div></section>

    <section className="join"><div className="eyebrow">MY 1%</div><h2>你不需要證明自己做得很多。<br/>只要開始留下你的 1%。</h2><p>加入後，參與、分享、同行天數與善意足跡會逐步累積；會員另有專屬內容與連結資源。</p><a className="primary light" href="/prototypes/RCSCA_MY1percent_signup_flow.html">加入 MY 1%</a></section>

    <footer><div><b>RCSCA</b><span>社團法人中華民國共享關懷協會</span></div><p>1% Cycle of Goodness · 一點點善意，讓善循環。</p></footer>
  </main>
}
