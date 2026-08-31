import SiteHeader from '../../SiteHeader';
const notices=[
 {tag:'公益行動',title:'中秋物資認購已完成核實',body:'你的這次參與已寫入共享足跡。金額不影響共享等級。',time:'今天'},
 {tag:'1% Network',title:'你關注的專業節點有新的連結',body:'新北地區新增一個可提供空間修繕協助的共享夥伴。',time:'昨天'},
 {tag:'共享小隊',title:'暖陽小隊完成新的共同里程碑',body:'本月真實共享行動已達成下一階段。',time:'3 天前'},
 {tag:'正式會員',title:'一筆生活找人需求等待你的回覆',body:'只有在雙方都同意後，系統才會交換聯絡方式。',time:'5 天前'}
];
export default function Notifications(){return <main className="accountPage"><SiteHeader/><section className="accountHero"><div className="portalWrap"><div className="eyebrow">我的通知</div><h1>只留下真正需要你知道的事情。</h1><p>通知服務參與、媒合與權限，不用大量促銷訊息干擾使用者。</p></div></section><section className="portalSection"><div className="portalWrap"><div className="noticeList">{notices.map((n,i)=><article key={i}><div><small>{n.tag}</small><h3>{n.title}</h3><p>{n.body}</p></div><time>{n.time}</time></article>)}</div><div className="privacyCallout"><strong>通知原則</strong><p>涉及個案、會員聯絡方式與企業未公開合作內容，只顯示必要摘要；敏感資訊不出現在通知預覽。</p></div></div></section></main>}
