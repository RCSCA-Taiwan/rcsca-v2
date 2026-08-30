'use client';

import { useEffect, useState } from 'react';

export default function BrandEntrance() {
  const [visible, setVisible] = useState(false);
  const [opening, setOpening] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      if (!sessionStorage.getItem('rcsca-brand-entered-v5')) setVisible(true);
    } catch { setVisible(true); }
    const t = window.setTimeout(() => setReady(true), 1500);
    return () => window.clearTimeout(t);
  }, []);

  const enter = () => {
    if (opening || !ready) return;
    setOpening(true);
    try { sessionStorage.setItem('rcsca-brand-entered-v5', '1'); } catch {}
    window.setTimeout(() => setVisible(false), 4300);
  };

  if (!visible) return null;

  return (
    <div className={`brandEntrance ${ready ? 'isReady' : ''} ${opening ? 'isOpening' : ''}`} role="dialog" aria-label="進入 RCSCA" onClick={enter}>
      <div className="entranceSmoke smokeA" aria-hidden="true"/><div className="entranceSmoke smokeB" aria-hidden="true"/><div className="entranceSmoke smokeC" aria-hidden="true"/>
      <button className="entranceButton" onClick={enter} aria-label="進入網站">
        <div className="entranceLockup">
          <span className="entranceRcsca">RCSCA</span>
          <span className="entranceCross">×</span>
          <span className="entranceOne"><b>1</b><i>%</i></span>
          <span className="entranceCross">×</span>
          <span className="entranceCycle">Cycle of<br/>Goodness</span>
        </div>
      </button>
    </div>
  );
}
