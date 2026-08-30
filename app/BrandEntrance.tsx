'use client';
import { CSSProperties, useEffect, useMemo, useState } from 'react';

type Star={x:number;y:number;s:number;o:number;d:number;dur:number;color:string;twinkle:boolean};
function seededStars(count:number){
  let seed=872341;
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
  const colors=['#ffffff','#f8f3df','#e8eefc','#e6c982','#fff7d6','#cdd9f3'];
  const out:Star[]=[];
  for(let i=0;i<count;i++){
    const depth=rand();
    out.push({
      x:rand()*100,y:rand()*100,
      s:depth<.62?.6+rand()*1.15:depth<.9?1.25+rand()*1.45:2.2+rand()*2.4,
      o:.24+rand()*.7,d:rand()*6,dur:3.6+rand()*8.5,
      color:colors[Math.floor(rand()*colors.length)],twinkle:rand()>.64
    });
  }
  return out;
}

export default function BrandEntrance(){
  const [visible,setVisible]=useState(false);
  const [opening,setOpening]=useState(false);
  const [ready,setReady]=useState(false);
  const stars=useMemo(()=>seededStars(145),[]);
  useEffect(()=>{
    try{ if(!sessionStorage.getItem('rcsca-brand-entered-v10')) setVisible(true); }
    catch{ setVisible(true); }
    const t=setTimeout(()=>setReady(true),1600);
    return()=>clearTimeout(t);
  },[]);
  const enter=()=>{
    if(opening||!ready)return;
    setOpening(true);
    window.dispatchEvent(new CustomEvent('rcsca:start-music'));
    try{sessionStorage.setItem('rcsca-brand-entered-v10','1')}catch{}
    setTimeout(()=>setVisible(false),4900);
  };
  if(!visible)return null;
  return <button className={`brandEntrance cosmicEntrance ${ready?'isReady':''} ${opening?'isOpening':''}`} onClick={enter} aria-label="進入 RCSCA">
    <div className="cosmos" aria-hidden="true">
      <div className="nebula nebulaA"></div><div className="nebula nebulaB"></div>
      {stars.map((st,i)=><i key={i} className={`realStar ${st.twinkle?'twinkle':''}`} style={{'--x':`${st.x}%`,'--y':`${st.y}%`,'--s':`${st.s}px`,'--o':st.o,'--delay':`${st.d}s`,'--dur':`${st.dur}s`,'--star':st.color} as CSSProperties}></i>)}
      <i className="shootingStar s1"></i><i className="shootingStar s2"></i><i className="shootingStar s3"></i>
      <i className="heroMeteor"></i><i className="meteorGlow"></i>
    </div>
    <div className="entranceLockup">
      <div className="entranceLegacy"><span className="entranceRcsca">RCSCA</span><span className="entranceCycle">Cycle of Goodness</span></div>
      <span className="entranceCross">×</span><span className="entranceOne"><b>1</b><i>%</i></span>
    </div>
  </button>;
}
