import AdminPageIntro from '../AdminPageIntro';import SiteHeader from '../../SiteHeader';
import LiveAdminAccess from './LiveAdminAccess';
export default function AdminAccessPage(){return <main className="adminPage"><SiteHeader/><AdminPageIntro section="access"/><section className="portalSection"><div className="portalWrap"><LiveAdminAccess/></div></section></main>}
