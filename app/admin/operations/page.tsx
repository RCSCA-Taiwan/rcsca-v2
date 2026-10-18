import AdminPageIntro from '../AdminPageIntro';
import SiteHeader from '../../SiteHeader';
import Link from 'next/link';
import LiveAuditLog from './LiveAuditLog';
import {ADMIN_WORKSPACES,PAGE_NAMES} from '../../../lib/site-navigation.mjs';
import './workspaces.css';
export default function AdminOperations(){return <main className="adminPage"><SiteHeader/><AdminPageIntro section="operations"/>
 <section className="portalSection"><div className="portalWrap">
 <nav id="workspaces" className="adminWorkspaces" aria-label="後台完整工作區">
 <h2>後台工作總覽</h2><p>依工作選擇入口；進入後仍依帳號的管理角色顯示可用資料與操作。</p>
 <div className="portalGrid three">{ADMIN_WORKSPACES.map(group=><article key={group.title}><h3>{group.title}</h3><p>{group.lead}</p>{group.items.map(([href,description])=><Link key={href} href={href}><strong>{PAGE_NAMES[href]}</strong><span>{description} →</span></Link>)}</article>)}</div>
 </nav>
 <section id="audit-log" className="adminWorkspaces"><div className="sectionHead"><div><div className="eyebrow">操作紀錄</div><h2>重要異動不能無痕覆寫。</h2></div><p>依管理權限查看操作人員、時間與處理結果。</p></div><LiveAuditLog/></section>
 </div></section></main>}
