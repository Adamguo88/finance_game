'use client';
import {useEffect,useRef,useState} from 'react';
import type {Scenario} from '@/domain/model';
import {StudioAudio} from './audio';
import {isForwardStep,type MotionCue,type PlaybackFrame} from './motion';
export function usePresentation(frame:PlaybackFrame,scenarios:Scenario[],stopPlayback:(playing:boolean)=>void,resetKey:number){
 const [manualReduced,setReduced]=useState(false),[systemReduced,setSystemReduced]=useState(false),[muted,setMuted]=useState(true),[volume,setVolume]=useState(.2),[ready,setReady]=useState(false),[audioError,setAudioError]=useState(false);
 const [cue,setCue]=useState<MotionCue>({token:0,start:0,duration:0,animate:false,kind:'month'});
 const audio=useRef<StudioAudio|null>(null),previous=useRef<PlaybackFrame|null>(null),seen=useRef(new Set<string>()),seenSession=useRef(resetKey);
 useEffect(()=>{
  const media=matchMedia('(prefers-reduced-motion: reduce)'),changed=()=>setSystemReduced(media.matches);changed();media.addEventListener('change',changed);
  try{const stored=JSON.parse(localStorage.getItem('life-studio-presentation')??'null');if(stored){setReduced(stored.reduced===true);setMuted(stored.muted!==false);if([0,.1,.2,.4].includes(stored.volume))setVolume(stored.volume);}}catch{}
  setReady(true);return()=>{media.removeEventListener('change',changed);audio.current?.close();audio.current=null;};
 },[]);
 useEffect(()=>{if(ready)try{localStorage.setItem('life-studio-presentation',JSON.stringify({reduced:manualReduced,muted,volume}));}catch{}},[ready,manualReduced,muted,volume]);
 useEffect(()=>{const hidden=()=>{if(document.hidden){audio.current?.suspend();stopPlayback(false);}};document.addEventListener('visibilitychange',hidden);return()=>document.removeEventListener('visibilitychange',hidden);},[stopPlayback]);
 const reduced=manualReduced||systemReduced;
 useEffect(()=>{
  const next={...frame,reduced:frame.reduced||reduced},prior=previous.current;previous.current=next;
  if(seenSession.current!==resetKey){seen.current.clear();seenSession.current=resetKey;}
  const forward=isForwardStep(prior,next)&&!document.hidden;
  const events=forward?scenarios.flatMap(s=>s.events.filter(e=>e.month===next.month).map(e=>({key:s.id+':'+s.revision+':'+e.id,kind:e.type==='buyHouse'?'home' as const:e.type==='unemployment'||e.type==='incomeChange'?'work' as const:'month' as const}))):[];
  const fresh=events.filter(e=>!seen.current.has(e.key));events.forEach(e=>seen.current.add(e.key));
  const kind=events.some(e=>e.kind==='home')?'home':events.some(e=>e.kind==='work')?'work':'month';
  const animate=forward&&!next.reduced;
  setCue(old=>!animate&&!old.animate?old:{token:old.token+1,start:performance.now(),duration:Math.min(220,700/next.speed),animate,kind});
  if(!next.playing||document.hidden||muted||volume<=0){audio.current?.suspend();return;}
  if(fresh.length)audio.current?.play(kind,volume);
 },[frame.scope,frame.month,frame.playing,frame.speed,frame.reduced,reduced,muted,volume,scenarios,resetKey]);
 async function enableSound(){audio.current??=new StudioAudio();const ok=await audio.current.enable();setAudioError(!ok);return ok;}
 return {cue,reduced,manualReduced,systemReduced,setReduced,muted,volume,setVolume,audioError,
  toggleMuted:async()=>{if(muted){await enableSound();setMuted(false);}else{audio.current?.suspend();setMuted(true);}},
  startAudio:()=>{if(!muted)void enableSound();},preview:async()=>{if(!muted&&await enableSound())audio.current?.play('home',volume);}};
}
