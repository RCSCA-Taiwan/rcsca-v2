'use client';
import { useEffect, useState } from 'react';

export default function BrandEntrance(){
  const [visible,setVisible]=useState(false);
  const [opening,setOpening]=useState(false);
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    try{ if(!sessionStorage.getItem('rcsca-brand-entered-v8')) setVisible(true); }
    catch{ setVisible(true); }
    const t=setTimeout(()=>setReady(true),1500);
    return()=>clearTimeout(t);
  },[]);
  const enter=()=>{
    if(opening||!ready)return;
    setOpening(true);
    try{sessionStorage.setItem('rcsca-brand-entered-v8','1')}catch{}
    setTimeout(()=>setVisible(false),4600);
  };
  if(!visible)return null;
  return <button className={`brandEntrance cosmicEntrance ${ready?'isReady':''} ${opening?'isOpening':''}`} onClick={enter} aria-label="進入 RCSCA">
    <div className="cosmos" aria-hidden="true">
      <span className="starField starA"></span><span className="starField starB"></span><span className="starField starC"></span>
      <i className="shootingStar s1"></i><i className="shootingStar s2"></i><i className="shootingStar s3"></i>
      <i className="heroMeteor"></i><i className="meteorGlow"></i>
    </div>
    <div className="entranceLockup">
      <div className="entranceLegacy"><span className="entranceRcsca">RCSCA</span><span className="entranceCycle">Cycle of Goodness</span></div>
      <span className="entranceCross">×</span><span className="entranceOne"><b>1</b><i>%</i></span>
    </div>
  </button>;
}
