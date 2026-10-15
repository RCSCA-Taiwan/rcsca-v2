import MembershipApplications from './MembershipApplications';
import AdminPageIntro from '../AdminPageIntro';import SiteHeader from '../../SiteHeader';import LiveAdminMembers from './LiveAdminMembers';
export default function AdminMembers(){return <main className="adminPage"><SiteHeader/><AdminPageIntro section="members"/><section className="portalSection"><div className="portalWrap"><MembershipApplications/><LiveAdminMembers/></div></section></main>}
