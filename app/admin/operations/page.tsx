import AdminPageIntro from '../AdminPageIntro';
import SiteHeader from '../../SiteHeader';
import Link from 'next/link';
import LiveAuditLog from './LiveAuditLog';
import BackupOperationsHealth from './BackupOperationsHealth';
import {ADMIN_WORKSPACES,PAGE_NAMES} from '../../../lib/site-navigation.mjs';
import './workspaces.css';

export const dynamic='force-dynamic';

export default function AdminOperations(){return <main className="adminPage"><SiteHeader/><AdminPageIntro section="operations"/>
 <section className="portalSection"><div className="portalWrap">
 <nav id="workspaces" className="adminWorkspaces" aria-label="後台完整工作區">
 <h2>後台工作總覽</h2><p>依工作選擇入口；進入後仍依帳號的管理角色顯示可用資料與操作。</p>
 <div className="portalGrid three">{ADMIN_WORKSPACES.map(group=><article key={group.title}><h3>{group.title}</h3><p>{group.lead}</p>{group.items.map(([href,description])=><Link key={href} href={href}><strong>{PAGE_NAMES[href]}</strong><span>{description} →</span></Link>)}</article>)}</div>
 </nav>
 <section id="backup-health" className="adminWorkspaces"><div className="sectionHead"><div><div className="eyebrow">災難復原</div><h2>備份不能只看「有排程」，要看最後一次真的有沒有成功。</h2></div><p>直接顯示 Backup Operations 最新執行狀態；正式備份、異地驗證與隔離還原任一未完成都不會顯示為健康。</p></div><BackupOperationsHealth/></section>
 <section id="audit-log" className="adminWorkspaces"><div className="sectionHead"><div><div className="eyebrow">操作紀錄</div><h2>重要異動不能無痕覆寫。</h2></div><p>依管理權限查看操作人員、時間與處理結果。</p></div><LiveAuditLog/></section>
 </div></section></main>}
