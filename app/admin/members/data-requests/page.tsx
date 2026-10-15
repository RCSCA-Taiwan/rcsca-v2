import SiteHeader from '../../../SiteHeader';
import AdminDataRequests from './AdminDataRequests';
export default function AdminDataRequestsPage(){return <main className="adminPage" lang="zh-Hant"><SiteHeader/><section className="portalSection"><div className="portalWrap"><h1>個人資料申請審核</h1><p>僅授權會員管理員可查看。審核核准不會自動修改、重置或刪除資料；實際處理完成後，請確認結果並留下紀錄。</p><AdminDataRequests/></div></section></main>;}
