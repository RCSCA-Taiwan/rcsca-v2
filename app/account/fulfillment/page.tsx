import RewardCancellations from '../../RewardCancellations';
import SiteHeader from '../../SiteHeader';
import FulfillmentOrders from '../../FulfillmentOrders';
export default function FulfillmentPage(){return <main className="flowPage" lang="zh-Hant"><SiteHeader/><section className="portalSection"><div className="portalWrap"><h1>共享所履約工作台</h1><RewardCancellations manage/><FulfillmentOrders manage/></div></section></main>;}
