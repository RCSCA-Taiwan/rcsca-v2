'use client';
import { useEffect, useRef, useState } from 'react';
import {useI18n} from './i18n';

const SRC='/audio/space-ambient-cinematic.mp3';
export default function MusicController(){
  const {t}=useI18n();
  const audioRef=useRef<HTMLAudioElement|null>(null);
  const [on,setOn]=useState(false);
  const [available,setAvailable]=useState(true);
  useEffect(()=>{
    const a=audioRef.current;if(!a)return;
    a.volume=.22;a.loop=true;
    try{const t=Number(sessionStorage.getItem('rcsca-music-time')||0);if(t>0&&Number.isFinite(t))a.currentTime=t}catch{}
    const start=async()=>{try{await a.play();setOn(true);sessionStorage.setItem('rcsca-music-on','1')}catch{}}
    const handler=()=>start();window.addEventListener('rcsca:start-music',handler as EventListener);
    try{if(sessionStorage.getItem('rcsca-music-on')==='1')start()}catch{}
    const save=()=>{try{sessionStorage.setItem('rcsca-music-time',String(a.currentTime))}catch{}};
    window.addEventListener('beforeunload',save);
    return()=>{window.removeEventListener('rcsca:start-music',handler as EventListener);window.removeEventListener('beforeunload',save)};
  },[]);
  const toggle=async()=>{const a=audioRef.current;if(!a)return;if(a.paused){try{await a.play();setOn(true);sessionStorage.setItem('rcsca-music-on','1')}catch{}}else{a.pause();setOn(false);sessionStorage.setItem('rcsca-music-on','0')}};
  return <><audio ref={audioRef} src={SRC} preload="auto" onError={()=>setAvailable(false)}/><button className={`soundToggle ${on?'on':''}`} onClick={toggle} aria-label={on?t('system.soundOff'):t('system.soundOn')} title={available?(on?t('system.soundOff'):t('system.soundPlay')):t('system.soundMissing')}>{on?'◉':'○'} <span>SOUND</span></button></>;
}
