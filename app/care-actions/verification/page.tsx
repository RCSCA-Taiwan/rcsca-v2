'use client';
import SiteHeader from '../../SiteHeader';
import {useState} from 'react';

const seed=[
 {name:'王○○',way:'轉帳',status:'待核實',footprint:'尚未建立'},
 {name:'陳○○',way:'現金',status:'已完成',footprint:'已建立'},
 {name:'林○○',way:'由協會聯絡',status:'資料確認中',footprint:'尚未建立'}
];
export default function Verification(){const [rows,setRows]=useState(seed);const verify=(i:number)=>setRows(rows.map((r,idx)=>idx===i?{...r,status:'已完成',footprint:'已建立'}:r));return <main className="verificationPage"><SiteHeader/>
<section className="flowHero"><div className="portalWrap"><div className="eyebrow">活動完成核實 · 示意流程</div><h1>財務怎麼交付，與共享價值分開管理。</h1><p>活動截止後，由協會依實際完成名單核實是否參與。完成後才建立共享足跡，並依活動規則發放 XP／共享點；不是依金額高低決定。</p></div></section>
<section className="portalSection"><div className="portalWrap"><div className="verificationTable"><div className="vtHead"><span>參與者</span><span>交付方式</span><span>完成狀態</span><span>共享足跡</span><span>操作</span></div>{rows.map((r,i)=><div className="vtRow" key={r.name+i}><span>{r.name}</span><span>{r.way}</span><span>{r.status}</span><span>{r.footprint}</span><span>{r.status==='已完成'?'已核實':<button onClick={()=>verify(i)}>標記完成</button>}</span></div>)}</div><div className="privacyCallout"><strong>這不是財務帳本。</strong><p>認購金額、捐款收據與帳務資料應進財務系統；這裡只負責「是否完成參與」及共享足跡。正式版會保留核實人、核實時間與 Audit Log。</p></div></div></section>
</main>}
