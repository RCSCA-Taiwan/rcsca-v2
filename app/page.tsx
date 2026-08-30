import BrandEntrance from './BrandEntrance';

const actions = [
  { tag: 'NOW', title: '2026 中秋物資認購', text: '育幼院與弱勢家庭中秋禮盒、生活及清潔物資。認購最低需求 200 單位，持續增加中。', cta: '了解目前行動' },
  { tag: 'MY 1%', title: '留下你的 1%', text: '每個人的 1% 都不同。每一次參與、分享與同行，都能留下自己的循環紀錄。', cta: '認識 MY 1%' },
  { tag: 'PASS IT ON', title: '讓受助者也能成為給予者', text: '接受幫助不是終點。任何人都能用自己定義的 1%，把這份循環繼續傳下去。', cta: '認識 PASS IT ON' },
]

export default function Home() {
  return <>
    <BrandEntrance />
    <main>
    <header className="nav"><div className="navInner"><div className="brand"><b>RCSCA</b><span>共享關懷協會</span></div><nav><a href="#action">正在發生</a><a href="#one">1%</a><a href="#impact">我們做過的事</a><a className="pill" href="/prototypes/RCSCA_MY1percent_signup_flow.html">加入 MY 1%</a></nav></div></header>

    <section className="hero homeHero"><div className="heroInner"><div className="eyebrow">RCSCA · CYCLE OF GOODNESS</div><h1><em>1%</em><br/>每個人的 1%，<br/>都不一樣。</h1><p>1% 不限定形式，也不比較大小。你決定自己的 1% 是什麼；重要的是，讓它開始發生，並有機會繼續傳下去。</p><div className="heroActions"><a className="primary" href="#action">參與現在的行動</a><a className="textLink" href="#one">1% 是什麼 →</a></div></div><div className="orbit" aria-hidden="true"><span className="one">1%</span><span className="o1">分享</span><span className="o2">參與</span><span className="o3">接住</span><span className="o4">再傳下去</span></div></section>

    <section id="action" className="section"><div className="sectionHead"><div><div className="eyebrow">HAPPENING NOW</div><h2>現在，可以一起做的事。</h2></div><p>參與沒有標準答案。從眼前一件你做得到的事開始。</p></div><div className="actionGrid">{actions.map((a,i)=><article className={`actionCard ${i===0?'featured':''}`} key={a.tag}><div className="eyebrow">{a.tag}</div><h3>{a.title}</h3><p>{a.text}</p><a href={i===1?'/prototypes/RCSCA_MY1percent_dashboard_prototype.html':i===2?'/prototypes/RCSCA_PASS_IT_ON_1percent_support_flow.html':'#'}>{a.cta} →</a></article>)}</div></section>

    <section id="impact" className="impact"><div className="eyebrow">WHAT WE HAVE DONE</div><h2>不是一次活動，<br/>而是一路累積的同行。</h2><div className="stats"><div><strong>2018</strong><span>從這一年開始<br/>持續走到今天</span></div><div><strong>近 2,000</strong><span>人次<br/>偏鄉與育幼院兒童</span></div><div><strong>持續</strong><span>把資源送到<br/>真正需要的地方</span></div></div><p className="sourceNote">成果數字以協會正式紀錄為準，後續由後台維護更新。</p></section>

    <section id="one" className="section oneSection"><div className="bigOne">1%</div><div className="oneCopy"><div className="eyebrow">CYCLE OF GOODNESS</div><h2>每個人的 1%，<br/>都不一樣。</h2><p>1% 不是一個金額，也不是固定的單位。對不同的人，它可以代表完全不同的參與方式。你決定自己的 1% 是什麼；我們在意的，是它如何被留下、被連結，再繼續往下一個人走。</p><div className="three"><div><b>定義</b><span>你的 1%，由你自己決定</span></div><div><b>連結</b><span>讓不同的 1% 找到可以發生的地方</span></div><div><b>傳遞</b><span>被接住的人，也能留下自己的 1%</span></div></div></div></section>

    <section className="pass"><div><div className="eyebrow">PASS IT ON</div><h2>今天被接住的人，<br/>明天也可以接住別人。</h2></div><div><p>我們想打破「施與受」的單向關係。真正的善循環，不是讓一個人永遠站在接受的一端，而是保留他的尊嚴、能力與選擇。</p><a href="/prototypes/RCSCA_PASS_IT_ON_1percent_support_flow.html">了解 PASS IT ON →</a></div></section>

    <section className="join"><div className="eyebrow">MY 1%</div><h2>不用比較誰做得更多。<br/>留下屬於你的 1%。</h2><p>加入後，參與、分享、同行天數與 1% 足跡會逐步累積；會員另有專屬內容與連結資源。</p><a className="primary light" href="/prototypes/RCSCA_MY1percent_signup_flow.html">加入 MY 1%</a></section>

    <footer><div><b>RCSCA</b><span>社團法人中華民國共享關懷協會</span></div><p>1% Cycle of Goodness · 每個人的 1%，都不一樣。</p></footer>
  </main>
  </>
}
