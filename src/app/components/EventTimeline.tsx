'use client';
import {useRef,useState} from 'react';
import type {Scenario,LifeEvent} from '@/domain/model';
import {eventTitle} from './FinancialForms';
const CELL=16,LABEL=104,CARD=144;
const tracks=[['buyHouse','住宅'],['unemployment','職涯'],['rentChange','租金'],['incomeChange','薪資']] as const;
export function EventTimeline({scenario,month,editable,onStart,onMove,onOpen,onSeek}:{scenario:Scenario;month:number;editable:boolean;onStart:()=>boolean;onMove:(id:string,month:number)=>void;onOpen:(event:LifeEvent)=>void;onSeek:(month:number)=>void}){
 const horizon=(90-scenario.profile.age)*12,scroll=useRef<HTMLDivElement>(null);
 const gesture=useRef<{id:string;pointer:number;x:number;month:number;next:number;moved:boolean}|null>(null);
 const suppressClick=useRef(false);
 const [preview,setPreview]=useState<{id:string;month:number}|null>(null);
 const lower=(scenario.forkMonth??0)+1;
 function locate(){scroll.current?.scrollTo({left:Math.max(0,LABEL+month*CELL-(scroll.current.clientWidth/2)),behavior:'smooth'});}
 return <section className="eventTimeline" aria-label="多軌事件時間軸">
  <div className="trackHeading"><h3>事件軌道 · {scenario.name}</h3><button type="button" onClick={locate}>定位目前月</button></div>
  <p id="track-help" className="muted">{editable?'拖曳卡片調整月份；左右鍵移動一月，Shift＋左右鍵移動一年，Enter 編輯。':'點選事件定位月份；切回編輯模式可調整。'} 分支點以前的事件鎖定。長時間軸可水平捲動。</p>
  <div ref={scroll} className="trackScroll" tabIndex={0} aria-label="事件軌道捲動區" aria-describedby="track-help">
   <div className="trackCanvas" style={{width:LABEL+(horizon+1)*CELL+CARD}}>
    <div className="trackRuler" aria-hidden="true">{Array.from({length:Math.floor(horizon/12)+1},(_,i)=><span key={i} style={{left:LABEL+i*12*CELL}}>第 {i*12} 月</span>)}</div>
    <div className="trackPlayhead" style={{left:LABEL+month*CELL}} aria-hidden="true"/>
    {tracks.filter(([type])=>scenario.engineVersion==='2.0.0'||type==='buyHouse'||type==='unemployment').map(([type,title])=>{
     const ends:number[]=[];
     const cards=scenario.events.filter(e=>e.type===type).sort((a,b)=>a.month-b.month||a.id.localeCompare(b.id,'en')).map(event=>{
      const at=preview?.id===event.id?preview.month:event.month;
      const duration=event.type==='unemployment'?Math.min(event.duration,horizon-at+1):1;
      const width=Math.max(CARD,duration*CELL),left=at*CELL;
      let row=ends.findIndex(end=>end+8<=left);if(row===-1)row=ends.length;ends[row]=left+width;
      return {event,at,duration,width,row};
     });
     return <div key={type} className="trackLane" style={{height:Math.max(1,ends.length)*76+8}}>
      <strong className="trackLabel">{title}</strong>
      {scenario.forkMonth!==null&&<div className="trackLocked" aria-hidden="true" style={{left:LABEL,width:(scenario.forkMonth+1)*CELL}}/>}
      {cards.length===0&&<span className="trackEmpty" style={{left:LABEL+8}}>尚無事件</span>}
      {cards.map(({event,at,duration,width,row})=>{
       const locked=event.month<lower,canMove=editable&&!locked;
       return <button key={event.id} type="button" className={'trackCard'+(locked?' locked':'')+(preview?.id===event.id?' moving':'')} data-event-id={event.id} style={{left:LABEL+at*CELL,top:row*76+8,width}} aria-label={`時間軸：${eventTitle(event)}，第 ${at} 月${locked?'，已鎖定':''}`} aria-describedby="track-help"
        onClick={e=>{if(suppressClick.current&&e.detail!==0){suppressClick.current=false;return;}suppressClick.current=false;if(editable&&!locked)onOpen(event);else onSeek(event.month);}}
        onKeyDown={e=>{if(e.key==='Escape'&&gesture.current){gesture.current=null;setPreview(null);suppressClick.current=true;e.preventDefault();return;}if(!canMove||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();if(!onStart())return;onMove(event.id,event.month+(e.key==='ArrowLeft'?-1:1)*(e.shiftKey?12:1));}}
        onPointerDown={e=>{suppressClick.current=false;if(!canMove||e.button!==0||!onStart())return;gesture.current={id:event.id,pointer:e.pointerId,x:e.clientX,month:event.month,next:event.month,moved:false};e.currentTarget.setPointerCapture(e.pointerId);}}
        onPointerMove={e=>{const g=gesture.current;if(!g||g.id!==event.id||g.pointer!==e.pointerId)return;const delta=e.clientX-g.x;if(Math.abs(delta)>4)g.moved=true;if(!g.moved)return;g.next=Math.min(horizon,Math.max(lower,g.month+Math.round(delta/CELL)));setPreview({id:g.id,month:g.next});}}
        onPointerUp={e=>{const g=gesture.current;if(!g||g.id!==event.id||g.pointer!==e.pointerId)return;gesture.current=null;setPreview(null);suppressClick.current=g.moved;if(g.moved)onMove(g.id,g.next);}}
        onPointerCancel={()=>{gesture.current=null;setPreview(null);suppressClick.current=true;}}
        onLostPointerCapture={()=>{gesture.current=null;setPreview(null);}}
       ><strong>{eventTitle(event)}</strong><span>第 {at} 月{event.type==='unemployment'?`–${at+duration-1} 月`:''}{locked?' · 已鎖定':''}</span></button>;
      })}
     </div>;
    })}
   </div>
  </div>
 </section>;
}
