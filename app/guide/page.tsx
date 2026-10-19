import SiteHeader from '../SiteHeader';
import TaskGuide from './TaskGuide';
import {Suspense} from 'react';
export const metadata={title:'操作指南與功能入口｜RCSCA'};
export default function Guide(){return <main><SiteHeader/><Suspense fallback={<section className="portalSection"><div className="portalWrap"><p role="status">正在載入功能指南…</p></div></section>}><TaskGuide/></Suspense></main>}
