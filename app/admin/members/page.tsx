import Link from 'next/link';
import MembershipApplications from './MembershipApplications';
import AdminPageIntro from '../AdminPageIntro';import SiteHeader from '../../SiteHeader';import LiveAdminMembers from './LiveAdminMembers';
export default function AdminMembers(){return <main className="adminPage"><SiteHeader/><AdminPageIntro section="members"/><section className="portalSection"><div className="portalWrap"><p><Link href="/admin/members/data-requests">個人資料修改／重置／刪除申請審核 →</Link></p><MembershipApplications/><LiveAdminMembers/></div></section></main>}
