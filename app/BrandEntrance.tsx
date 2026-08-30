'use client';

import { useEffect, useState } from 'react';

export default function BrandEntrance() {
  const [visible, setVisible] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    try {
      if (!sessionStorage.getItem('rcsca-brand-entered-v3')) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const enter = () => {
    if (opening) return;
    setOpening(true);
    try { sessionStorage.setItem('rcsca-brand-entered-v3', '1'); } catch {}
    window.setTimeout(() => setVisible(false), 2100);
  };

  if (!visible) return null;

  return (
    <div
      className={`brandEntrance ${opening ? 'isOpening' : ''}`}
      role="dialog"
      aria-label="進入 RCSCA"
      onClick={enter}
    >
      <div className="entranceSmoke smokeA" aria-hidden="true" />
      <div className="entranceSmoke smokeB" aria-hidden="true" />
      <div className="entranceSmoke smokeC" aria-hidden="true" />
      <button className="entranceButton" onClick={enter} aria-label="進入網站">
        <span className="entranceOne">1%</span>
      </button>
    </div>
  );
}
