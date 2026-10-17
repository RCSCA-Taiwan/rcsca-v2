'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import './brand-entrance.css';

const HOLD_MS = 1400;
const FADE_MS = 950;
const ENTRY_SOUND_SRC = '/audio/brand-doorbell-high.mp3';

export default function BrandEntrance({children}: {children: ReactNode}) {
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<'idle' | 'playing' | 'fading'>('idle');
  const [ready, setReady] = useState(false);
  const activated = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const sound = new Audio(ENTRY_SOUND_SRC);
    sound.preload = 'auto';
    sound.volume = 0.65;
    audio.current = sound;
    const replay = new URLSearchParams(window.location.search).get('intro') === 'replay';
    try { if (!replay && sessionStorage.getItem('rcsca-brand-entered-v20')) setVisible(false); } catch {}
    timers.current.push(setTimeout(() => setReady(true), 1450));
    return () => {
      timers.current.forEach(clearTimeout);
      sound.pause();
      sound.removeAttribute('src');
      sound.load();
      if (audio.current === sound) audio.current = null;
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      if (activated.current) window.dispatchEvent(new CustomEvent('rcsca:start-music'));
      return;
    }
    window.scrollTo(0, 0);
    const stopScroll = (event: Event) => event.preventDefault();
    const stopScrollKeys = (event: KeyboardEvent) => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(event.key)) event.preventDefault();
    };
    window.addEventListener('wheel', stopScroll, {passive: false});
    window.addEventListener('touchmove', stopScroll, {passive: false});
    window.addEventListener('keydown', stopScrollKeys);
    return () => {
      window.removeEventListener('wheel', stopScroll);
      window.removeEventListener('touchmove', stopScroll);
      window.removeEventListener('keydown', stopScrollKeys);
    };
  }, [visible]);

  const enter = () => {
    if (activated.current || !ready) return;
    activated.current = true;
    if (audio.current) {
      audio.current.currentTime = 0;
      void audio.current.play().catch(() => {});
    }
    setPhase('playing');
    timers.current.push(setTimeout(() => setPhase('fading'), HOLD_MS));
    timers.current.push(setTimeout(() => {
      try { sessionStorage.setItem('rcsca-brand-entered-v20', '1'); } catch {}
      setVisible(false);
      if (audio.current) { audio.current.pause(); audio.current.currentTime = 0; }
      requestAnimationFrame(() => window.scrollTo(0, 0));
    }, HOLD_MS + FADE_MS));
  };

  if (!visible) return <>{children}</>;
  return <button className={`brandEntrance traceEntrance gatedEntrance ${ready ? 'isReady' : ''}`} data-phase={phase} onClick={enter} disabled={!ready || phase !== 'idle'} aria-busy={!ready || phase !== 'idle'} aria-label="進入 RCSCA">
    <div className="blackSpace" aria-hidden="true"><i className="ambientGlow"></i><i className="preTrace traceA"></i><i className="preTrace traceB"></i><i className="heroTrace"></i><i className="traceSilk"></i><i className="traceWash"></i></div>
    <div className="entranceLockup luxuryLockup"><div className="entranceLegacy"><span className="entranceRcsca">RCSCA</span><span className="entranceCycle">Cycle of Goodness</span></div><span className="entranceCross">×</span><span className="entranceOne"><b>1</b><i>%</i></span></div>
    <span className="traceCaption">THE 1% TRACE</span>
  </button>;
}
