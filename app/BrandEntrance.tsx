'use client';
import { useEffect, useState } from 'react';

export default function BrandEntrance(){
  const [visible,setVisible]=useState(false);
  const [opening,setOpening]=useState(false);
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    try{ if(!sessionStorage.getItem('rcsca-brand-entered-v12')) setVisible(true); }
    catch{ setVisible(true); }
    const t=setTimeout(()=>setReady(true),1450);
    return()=>clearTimeout(t);
  },[]);
  const enter=()=>{
    if(opening||!ready)return;
    setOpening(true);
    window.dispatchEvent(new CustomEvent('rcsca:start-music'));
    try{sessionStorage.setItem('rcsca-brand-entered-v12','1')}catch{}
    setTimeout(()=>setVisible(false),4400);
  };
  if(!visible)return null;
  return <button className={`brandEntrance traceEntrance ${ready?'isReady':''} ${opening?'isOpening':''}`} onClick={enter} aria-label="進入 RCSCA">
    <div className="blackSpace" aria-hidden="true"><i className="ambientGlow"></i><i className="preTrace traceA"></i><i className="preTrace traceB"></i><i className="heroTrace"></i><i className="traceSilk"></i><i className="traceWash"></i></div>
    <div className="entranceLockup luxuryLockup"><div className="entranceLegacy"><span className="entranceRcsca">RCSCA</span><span className="entranceCycle">Cycle of Goodness</span></div><span className="entranceCross">×</span><span className="entranceOne"><b>1</b><i>%</i></span></div>
    <span className="traceCaption">THE 1% TRACE</span>
  </button>;
}
