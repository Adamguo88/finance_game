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
  // StrictMode can restart an effect while preserving its previous loading state.
  setState('svg');const target=host.current;
  if(!target||!supportsWebGL())return;
  const release=takeRendererSlot();if(!release)return;
  const abort=new AbortController();let disposed=false,initializing=false;
  let owned:WorldRenderer|null=null;setState('loading');
  const destroyOwned=()=>{
   if(controller.current===owned)controller.current=null;
   owned?.destroy();owned=null;
  };
  const lost=()=>{destroyOwned();release();if(!disposed)setState('svg');};
  import('./pixi-world').then(async({createWorldRenderer})=>{
   if(abort.signal.aborted){release();return;}
   initializing=true;
   owned=await createWorldRenderer(target,abort.signal,lost);
   if(abort.signal.aborted){destroyOwned();release();return;}
   controller.current=owned;owned.update(latest.current);setState('pixi');
  }).catch(()=>{destroyOwned();release();if(!disposed)setState('svg');});
  return()=>{
   disposed=true;abort.abort();
   if(owned){destroyOwned();release();}
   // No GPU exists while dynamic import is pending. An in-flight init must settle first.
   else if(!initializing)release();
  };
 },[]);
 useEffect(()=>{controller.current?.update(view);},[view.owned,view.employed,view.mortgage,view.gap]);
 return {host,state};
}
