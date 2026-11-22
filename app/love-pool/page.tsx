'use client';
import SiteHeader from '../SiteHeader';
import {useEffect,useState} from 'react';
import {getSupabaseBrowserClient} from '../../lib/supabase-browser';

type Status='loading'|'visitor'|'registered'|'member';
export default function LovePool(){
 const [status,setStatus]=useState<Status>('loading');
 const [balance,setBalance]=useState<number|null>(null);
 useEffect(()=>{let active=true;(async()=>{try{const s=getSupabaseBrowserClient();const {data:{session}}=await s.auth.getSession();if(!session){if(active)setStatus('visitor');return;}const [m,w]=await Promise.all([s.from('memberships').select('status').eq('user_id',session.user.id).maybeSingle(),s.rpc('point_wallet_self')]);if(active){setStatus(!m.error&&m.data?.status==='active'?'member':'registered');setBalance(w.error?null:Number((w.data as {balance?:number}|null)?.balance??0));}}catch{if(active)setStatus('registered')}})();return()=>{active=false}},[]);
 return <main className="institutionPage" lang="zh-Hant"><SiteHeader/>
 <section className="portalSection"><div className="portalWrap legalCopy">
 <p className="eyebrow">RCSCA × 1%｜公益共享機制</p><h1>共享愛心公池</h1>
 <p>有些共享點，不一定要兌換成自己的禮物。讓願意分享的會員，把尚未使用的共享點集合起來，由協會兌換公益物資或服務，送到需要幫助的孩子手中。</p>
 <div style={{border:'1px solid #b5c8c1',borderRadius:16,padding:20,margin:'24px 0'}}>
 <h2 style={{marginTop:0}}>公池功能建置中</h2><p>目前開放制度與操作流程預覽；尚未開放捐點、扣點、專案募集或公益兌換。以下不顯示虛構的公池餘額或受助成果。</p>
 <p><strong>我的身份：</strong>{status==='loading'?'讀取中…':status==='visitor'?'尚未登入':status==='member'?'有效 RCSCA 會員':'一般註冊用戶／會籍尚未啟用'}</p>
 <p><strong>目前可用共享點：</strong>{balance===null?'—':balance.toLocaleString('zh-TW')+' 點'}</p>
 <p>{status==='member'?'您符合正式會員資格；捐點交易須待系統安全驗收及法規確認後才會開放。':status==='visitor'?'登入後可查看個人積分；只有有效正式會員可捐點或兌換。':'一般註冊用戶可累積點數，但不能捐點或兌換；正式入會後可使用尚未到期的點數。'}</p>
 <button type="button" disabled style={{opacity:.6,cursor:'not-allowed',padding:'12px 24px',borderRadius:10}}>分享共享點（尚未開放）</button>
 <p><a className="textRoute" href="/account/identity">查看我的會籍 →</a></p>
 </div>
 <h2>共享點如何成為孩子的禮物？</h2>
 <ol><li>有效正式會員自願選擇捐出有效共享點。</li><li>會員可選擇指定公益專案，或交由協會統籌。</li><li>協會使用公池點數兌換合作企業提供的公益物資或服務。</li><li>完成交付核實後，公布不含兒童可識別個資的公益成果。</li></ol>
 <h2>公益專案</h2><p>專案募集尚未啟用。未來會顯示各專案目標、已累積點數、所需物資與完成進度；目前不展示示意數字冒充真實募集成果。</p>
 <h2>公池公開紀錄</h2><p>待啟用後將呈現可用點數、已使用點數、到期點數、兌換品項及交付成果。個別會員捐點紀錄僅本人及授權管理員可查看。</p>
 <h2>我的歷年愛心分享</h2><p>未來個人頁面會永久保留累積捐出點數紀錄；不因年度點數到期而清除，也不因捐點額外增加共享點或 XP。</p>
 <h2>公池使用原則</h2>
 <ul><li>限有效正式協會會員捐點；一般註冊用戶可累積點數但不能捐點或兌換。</li><li>點數不能兌現、出售或換成捐款收據；捐點不等於現金捐款。</li><li>轉入公池的點數保留原到期日，不因轉入延長效期。</li><li>正式交易須再次確認並由伺服器核實會籍、點數與效期。</li><li>僅用於經協會核准的公益物資及服務，保留完整稽核紀錄。</li></ul>
 <p>本頁為建置中的制度預覽。正式交易開放前，仍須完成法規適用確認、後台審核、資料庫交易及安全驗收。</p>
 <p><a className="textRoute" href="/share-market">前往 1% 共享所 →</a></p>
 <p><a className="textRoute" href="/my-1percent">返回 MY 1% →</a></p>
 </div></section></main>
}