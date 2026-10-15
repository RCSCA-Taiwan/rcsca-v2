'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import './brand-entrance.css';

const RING_MS = 1400;
const FADE_MS = 950;

/** A locally synthesized two-note doorbell, started only by an explicit activation. */
function ringDoorbell(): AudioContext | null {
  try {
    const Audio = window.AudioContext || (window as typeof window & {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
    if (!Audio) return null;
    const context = new Audio();
    void context.resume().catch(() => {});
    const start = context.currentTime + 0.02;
    for (const [offset, frequency] of [[0, 659.25], [0.45, 523.25]]) {
      for (const [harmonic, volume] of [[1, 0.18], [2.01, 0.045], [3.96, 0.012]]) {
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        const at = start + offset;
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency * harmonic;
        envelope.gain.setValueAtTime(0.0001, at);
        envelope.gain.exponentialRampToValueAtTime(volume, at + 0.008);
        envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.85);
        oscillator.connect(envelope);
        envelope.connect(context.destination);
        oscillator.start(at);
        oscillator.stop(at + 0.86);
      }
    }
    return context;
  } catch { return null; }
}

export default function BrandEntrance({children}: {children: ReactNode}) {
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<'idle' | 'ringing' | 'fading'>('idle');
  const [ready, setReady] = useState(false);
  const activated = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const audio = useRef<AudioContext | null>(null);

  useEffect(() => {
    const replay = new URLSearchParams(window.location.search).get('intro') === 'replay';
    try { if (!replay && sessionStorage.getItem('rcsca-brand-entered-v20')) setVisible(false); } catch {}
    timers.current.push(setTimeout(() => setReady(true), 1450));
    return () => {
      timers.current.forEach(clearTimeout);
      if (audio.current) void audio.current.close().catch(() => {});
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
    audio.current = ringDoorbell();
    setPhase('ringing');
    timers.current.push(setTimeout(() => setPhase('fading'), RING_MS));
    timers.current.push(setTimeout(() => {
      try { sessionStorage.setItem('rcsca-brand-entered-v20', '1'); } catch {}
      setVisible(false);
      if (audio.current) void audio.current.close().catch(() => {});
      requestAnimationFrame(() => window.scrollTo(0, 0));
    }, RING_MS + FADE_MS));
  };

  if (!visible) return <>{children}</>;
  return <button className={`brandEntrance traceEntrance gatedEntrance ${ready ? 'isReady' : ''}`} data-phase={phase} onClick={enter} disabled={!ready || phase !== 'idle'} aria-busy={!ready || phase !== 'idle'} aria-label="進入 RCSCA">
    <div className="blackSpace" aria-hidden="true"><i className="ambientGlow"></i><i className="preTrace traceA"></i><i className="preTrace traceB"></i><i className="heroTrace"></i><i className="traceSilk"></i><i className="traceWash"></i></div>
    <div className="entranceLockup luxuryLockup"><div className="entranceLegacy"><span className="entranceRcsca">RCSCA</span><span className="entranceCycle">Cycle of Goodness</span></div><span className="entranceCross">×</span><span className="entranceOne"><b>1</b><i>%</i></span></div>
    <span className="traceCaption">THE 1% TRACE</span>
  </button>;
}
