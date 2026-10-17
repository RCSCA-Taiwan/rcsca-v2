'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import './brand-entrance.css';

const FLYBY_MS = 1400;
const FADE_MS = 950;

/** A short jet flyby, synthesized locally after an explicit click or key activation. */
function playAircraftFlyby(): AudioContext | null {
  let context:AudioContext|null=null;
  try {
    const Audio = window.AudioContext || (window as typeof window & {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
    if (!Audio) return null;
    context = new Audio();
    void context.resume().catch(() => {});
    const start = context.currentTime + 0.02;
    const duration = 2.25;
    const master = context.createGain();
    // A brief click-free onset, then distance attenuation rather than an abrupt stop.
    master.gain.setValueAtTime(0.0001, start);
    master.gain.exponentialRampToValueAtTime(0.24, start + 0.10);
    master.gain.exponentialRampToValueAtTime(0.13, start + 0.55);
    master.gain.exponentialRampToValueAtTime(0.018, start + 1.65);
    master.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    const pan = context.createStereoPanner();
    pan.pan.setValueAtTime(-0.4, start);
    pan.pan.linearRampToValueAtTime(0.65, start + duration);
    master.connect(pan);pan.connect(context.destination);

    // Filtered brown noise supplies the broad, low engine/air roar.
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
    const samples = buffer.getChannelData(0);
    let brown = 0;
    for(let i=0;i<samples.length;i++){
      brown=(brown+(Math.random()*2-1)*0.035)/1.035;
      samples[i]=brown*3.5;
    }
    const air = context.createBufferSource();air.buffer=buffer;
    const lowpass=context.createBiquadFilter();lowpass.type='lowpass';
    lowpass.frequency.setValueAtTime(1800,start);
    lowpass.frequency.exponentialRampToValueAtTime(260,start+duration);
    lowpass.Q.value=0.4;
    air.connect(lowpass);lowpass.connect(master);air.start(start);air.stop(start+duration);

    // Falling turbine harmonics suggest the Doppler shift as the aircraft recedes.
    for(const [near,far,volume] of [[170,64,0.11],[340,128,0.035],[680,256,0.012]]){
      const engine=context.createOscillator();engine.type='triangle';engine.frequency.value=near;
      engine.frequency.setValueAtTime(near,start);
      engine.frequency.exponentialRampToValueAtTime(far,start+duration);
      const gain=context.createGain();gain.gain.value=volume;
      engine.connect(gain);gain.connect(master);engine.start(start);engine.stop(start+duration);
    }
    return context;
  } catch { if(context)void context.close().catch(()=>{});return null; }
}

export default function BrandEntrance({children}: {children: ReactNode}) {
  const [visible, setVisible] = useState(true);
  const [phase, setPhase] = useState<'idle' | 'flyby' | 'fading'>('idle');
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
    audio.current = playAircraftFlyby();
    setPhase('flyby');
    timers.current.push(setTimeout(() => setPhase('fading'), FLYBY_MS));
    timers.current.push(setTimeout(() => {
      try { sessionStorage.setItem('rcsca-brand-entered-v20', '1'); } catch {}
      setVisible(false);
      if (audio.current) void audio.current.close().catch(() => {});
      requestAnimationFrame(() => window.scrollTo(0, 0));
    }, FLYBY_MS + FADE_MS));
  };

  if (!visible) return <>{children}</>;
  return <button className={`brandEntrance traceEntrance gatedEntrance ${ready ? 'isReady' : ''}`} data-phase={phase} onClick={enter} disabled={!ready || phase !== 'idle'} aria-busy={!ready || phase !== 'idle'} aria-label="進入 RCSCA">
    <div className="blackSpace" aria-hidden="true"><i className="ambientGlow"></i><i className="preTrace traceA"></i><i className="preTrace traceB"></i><i className="heroTrace"></i><i className="traceSilk"></i><i className="traceWash"></i></div>
    <div className="entranceLockup luxuryLockup"><div className="entranceLegacy"><span className="entranceRcsca">RCSCA</span><span className="entranceCycle">Cycle of Goodness</span></div><span className="entranceCross">×</span><span className="entranceOne"><b>1</b><i>%</i></span></div>
    <span className="traceCaption">THE 1% TRACE</span>
  </button>;
}
