'use client';
import { useEffect, useState } from 'react';
export default function BrandEntrance(){
 const [visible,setVisible]=useState(false); const [opening,setOpening]=useState(false); const [ready,setReady]=useState(false);
 useEffect(()=>{try{if(!sessionStorage.getItem('rcsca-brand-entered-v6'))setVisible(true)}catch{setVisible(true)} const t=setTimeout(()=>setReady(true),1500);return()=>clearTimeout(t)},[]);
 const enter=()=>{if(opening||!ready)return;setOpening(true);try{sessionStorage.setItem('rcsca-brand-entered-v6','1')}catch{} setTimeout(()=>setVisible(false),4200)};
 if(!visible)return null;
 return <button className={`brandEntrance ${ready?'isReady':''} ${opening?'isOpening':''}`} onClick={enter} aria-label="進入 RCSCA"><div className="smoke smokeA"></div><div className="smoke smokeB"></div><div className="smoke smokeC"></div><div className="entranceLockup"><div className="entranceLegacy"><span className="entranceRcsca">RCSCA</span><span className="entranceCycle">Cycle of Goodness</span></div><span className="entranceCross">×</span><span className="entranceOne"><b>1</b><i>%</i></span></div></button>
}
