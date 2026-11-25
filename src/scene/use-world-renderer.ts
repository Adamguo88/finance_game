'use client';
import {useEffect,useRef,useState} from 'react';
import {takeRendererSlot} from './renderer-slots';
import type {WorldRenderer,WorldView} from './pixi-world';
let supported:boolean|undefined;
function supportsWebGL(){if(supported!==undefined)return supported;try{const canvas=document.createElement('canvas'),gl=canvas.getContext('webgl2')??canvas.getContext('webgl');supported=!!gl;gl?.getExtension('WEBGL_lose_context')?.loseContext();}catch{supported=false;}return supported;}
export function useWorldRenderer(view:WorldView){
 const host=useRef<HTMLDivElement>(null),controller=useRef<WorldRenderer|null>(null),latest=useRef(view);latest.current=view;
 const [state,setState]=useState<'svg'|'loading'|'pixi'>('svg');
 useEffect(()=>{
  if(!host.current||!supportsWebGL())return;
  const release=takeRendererSlot();if(!release)return;
  const abort=new AbortController();let disposed=false;setState('loading');
  const lost=()=>{controller.current?.destroy();controller.current=null;release();if(!disposed)setState('svg');};
  import('./pixi-world').then(async({createWorldRenderer})=>{
   if(abort.signal.aborted){release();return;}
   const c=await createWorldRenderer(host.current!,abort.signal,lost);
   if(abort.signal.aborted){c.destroy();release();return;}
   controller.current=c;c.update(latest.current);setState('pixi');
  }).catch(()=>{controller.current?.destroy();controller.current=null;release();if(!disposed)setState('svg');});
  return()=>{disposed=true;abort.abort();if(controller.current){controller.current.destroy();controller.current=null;release();}};
 },[]);
 useEffect(()=>{controller.current?.update(view);},[view.owned,view.employed,view.mortgage,view.gap]);
 return {host,state};
}
