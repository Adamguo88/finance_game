'use client';
import {useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import type {Scenario,LifeEvent} from '@/domain/model';
import {eventTitle} from './FinancialForms';
import {monthWidth,tickStep,rulerMonths,packEvents,TIMELINE_LABEL as LABEL,TIMELINE_CARD as CARD,TIMELINE_ROW as ROW,type TimelineScale} from './timeline-layout';
const tracks=[['buyHouse','住宅'],['unemployment','職涯'],['rentChange','租金'],['incomeChange','薪資']] as const;
export function EventTimeline({scenario,month,editable,seekLimit,onStart,onMove,onOpen,onSeek}:{scenario:Scenario;month:number;editable:boolean;seekLimit?:number;onStart:()=>boolean;onMove:(id:string,month:number)=>void;onOpen:(event:LifeEvent)=>void;onSeek:(month:number)=>void}){
 const horizon=(90-scenario.profile.age)*12,scroll=useRef<HTMLDivElement>(null),help=useId();
 const [scale,setScale]=useState<TimelineScale>('year'),[viewport,setViewport]=useState(900),[target,setTarget]=useState(String(month)),[seekError,setSeekError]=useState(''),[focusRequest,setFocusRequest]=useState<string|null>(null);
 const CELL=monthWidth(scale,horizon,viewport),step=tickStep(scale,horizon),anchor=useRef<number|null>(null);
 useEffect(()=>{const el=scroll.current;if(!el)return;const measure=()=>setViewport(el.clientWidth);measure();const observer=new ResizeObserver(measure);observer.observe(el);return()=>observer.disconnect();},[]);
 useEffect(()=>{setTarget(String(month));setSeekError('');},[month]);
 useLayoutEffect(()=>{if(anchor.current===null||!scroll.current)return;scroll.current.scrollLeft=Math.max(0,LABEL+anchor.current*CELL-scroll.current.clientWidth/2);anchor.current=null;},[CELL]);
 useEffect(()=>{const node=document.activeElement;if(node instanceof HTMLButtonElement&&node.dataset.eventId&&scroll.current?.contains(node))node.scrollIntoView({block:'nearest',inline:'nearest'});},[scenario.revision]);
 const gesture=useRef<{id:string;pointer:number;x:number;month:number;next:number;moved:boolean;cell:number;scrollLeft:number;node:HTMLButtonElement}|null>(null);
 const suppressClick=useRef(false);
 const [preview,setPreview]=useState<{id:string;month:number}|null>(null);
 const lower=(scenario.forkMonth??0)+1,seekHorizon=Math.min(horizon,seekLimit??horizon);
 useLayoutEffect(()=>{if(focusRequest!==null){focusEvent(focusRequest);setFocusRequest(null);}},[focusRequest,scenario.revision]);
 function move(id:string,at:number){setFocusRequest(id);onMove(id,at);}
 function locate(){scroll.current?.scrollTo({left:Math.max(0,LABEL+month*CELL-(scroll.current.clientWidth/2)),behavior:'instant'});}
 function cancelGesture(){const g=gesture.current;gesture.current=null;setPreview(null);suppressClick.current=true;if(g?.node.hasPointerCapture(g.pointer))g.node.releasePointerCapture(g.pointer);}
 function zoom(next:TimelineScale){cancelGesture();const el=scroll.current;if(el)anchor.current=Math.max(0,Math.min(horizon,(el.scrollLeft+el.clientWidth/2-LABEL)/CELL));setScale(next);}
 function focusEvent(id:string){const node=Array.from(scroll.current?.querySelectorAll<HTMLButtonElement>('[data-event-id]')??[]).find(n=>n.dataset.eventId===id);node?.focus({preventScroll:true});node?.scrollIntoView({block:'nearest',inline:'nearest'});const el=scroll.current;if(node&&el&&node.offsetLeft<el.scrollLeft+LABEL)el.scrollLeft=Math.max(0,node.offsetLeft-LABEL-8);}
 function navigateCard(node:HTMLButtonElement,key:string){const nodes=Array.from(node.closest('.trackLane')?.querySelectorAll<HTMLButtonElement>('[data-event-id]')??[]),index=nodes.indexOf(node);const at=key==='Home'?0:key==='End'?nodes.length-1:Math.max(0,Math.min(nodes.length-1,index+(key==='ArrowUp'?-1:1)));const next=nodes[at];if(next)focusEvent(next.dataset.eventId!);}
 function seek(e:React.FormEvent){e.preventDefault();const at=target.trim()===''?NaN:Number(target);if(!Number.isInteger(at)||at<0||at>seekHorizon){setSeekError(`請輸入 0–${seekHorizon} 的整數月份。`);return;}if(!onStart())return;setSeekError('');setTarget(String(at));onSeek(at);locateMonth(at);}
 function locateMonth(at:number){scroll.current?.scrollTo({left:Math.max(0,LABEL+at*CELL-(scroll.current.clientWidth/2)),behavior:'instant'});}
 return <section className="eventTimeline" aria-label="多軌事件時間軸">
  <div className="trackHeading"><h3>事件軌道 · {scenario.name}</h3><button type="button" onClick={locate}>定位目前月</button></div>
  <div className="trackTools"><label>縮放<select aria-label="時間軸縮放" value={scale} onChange={e=>zoom(e.target.value as TimelineScale)}><option value="month">月份詳覽</option><option value="year">年度規劃</option><option value="life">全人生概覽</option></select></label><form onSubmit={seek} noValidate><label>跳至第幾月<input aria-label="跳至第幾月" aria-invalid={!!seekError} aria-describedby={seekError?help+'-seek-error':undefined} type="number" min={0} max={seekHorizon} step={1} value={target} onFocus={()=>onStart()} onChange={e=>{setTarget(e.target.value);setSeekError('');}} onKeyDown={e=>{if(e.key==='Escape'){setTarget(String(month));setSeekError('');}}}/></label><button type="submit">跳轉月份</button></form><label>尋找事件<select aria-label="尋找時間軸事件" value="" onChange={e=>{if(onStart())focusEvent(e.target.value);}}><option value="">選擇要查看的事件…</option>{[...scenario.events].sort((a,b)=>a.month-b.month||a.id.localeCompare(b.id,'en')).map(e=><option key={e.id} value={e.id}>第 {e.month} 月 · {eventTitle(e)}</option>)}</select></label></div>
  {seekError&&<p id={help+'-seek-error'} role="alert">{seekError}</p>}
  <p id={help} className="muted">{editable?'拖曳卡片調整月份；左右鍵移動一月，Shift＋左右鍵移動一年，Enter 編輯。':'點選事件定位月份；切回編輯模式可調整。'} 上下鍵選擇同軌事件，Home／End 到首末張。分支點以前的事件鎖定。縮放與尋找事件不改目前月份，長時間軸可水平捲動。</p>
  <div ref={scroll} className="trackScroll" tabIndex={0} aria-label="事件軌道捲動區" aria-describedby={help}>
   <div className="trackCanvas" data-scale={scale} style={{width:LABEL+(horizon+1)*CELL+CARD}}>
    <div className="trackRuler" aria-hidden="true">{rulerMonths(horizon,step).map(at=><span key={at} style={{left:LABEL+at*CELL}}>{scale==='month'?`第 ${at} 月`:`第 ${at/12} 年`}</span>)}</div>
    <div className="trackPlayhead" style={{left:LABEL+month*CELL}} aria-hidden="true"/>
    {tracks.filter(([type])=>scenario.engineVersion==='2.0.0'||type==='buyHouse'||type==='unemployment').map(([type,title])=>{
     const {cards,rows}=packEvents(scenario.events.filter(e=>e.type===type),CELL,horizon,preview);
     return <div key={type} className="trackLane" style={{height:rows*ROW+8,backgroundImage:`repeating-linear-gradient(90deg,transparent 0,transparent ${step*CELL-1}px,#dfe5da ${step*CELL-1}px,#dfe5da ${step*CELL}px)`}}>
      <strong className="trackLabel">{title}</strong>
      {scenario.forkMonth!==null&&<div className="trackLocked" aria-hidden="true" style={{left:LABEL,width:(scenario.forkMonth+1)*CELL}}/>}
      {cards.length===0&&<span className="trackEmpty" style={{left:LABEL+8}}>尚無事件</span>}
      {cards.map(({event,at,duration,width,row})=>{
       const locked=event.month<lower,canMove=editable&&!locked;
       return <button key={event.id} type="button" className={'trackCard'+(locked?' locked':'')+(preview?.id===event.id?' moving':'')} data-event-id={event.id} style={{left:LABEL+at*CELL,top:row*ROW+8,width}} aria-label={`時間軸：${eventTitle(event)}，第 ${at} 月${locked?'，已鎖定':''}`} aria-describedby={help}
        onClick={e=>{if(suppressClick.current&&e.detail!==0){suppressClick.current=false;return;}suppressClick.current=false;if(editable&&!locked)onOpen(event);else onSeek(event.month);}}
        onKeyDown={e=>{if(e.key==='Escape'&&gesture.current){cancelGesture();e.preventDefault();return;}if(['ArrowUp','ArrowDown','Home','End'].includes(e.key)){e.preventDefault();navigateCard(e.currentTarget,e.key);return;}if(!canMove||!['ArrowLeft','ArrowRight'].includes(e.key))return;if(e.repeat){e.preventDefault();return;}e.preventDefault();if(!onStart())return;move(event.id,event.month+(e.key==='ArrowLeft'?-1:1)*(e.shiftKey?12:1));}}
        onPointerDown={e=>{suppressClick.current=false;if(!canMove||e.button!==0||!onStart())return;gesture.current={id:event.id,pointer:e.pointerId,x:e.clientX,month:event.month,next:event.month,moved:false,cell:CELL,scrollLeft:scroll.current?.scrollLeft??0,node:e.currentTarget};e.currentTarget.setPointerCapture(e.pointerId);}}
        onPointerMove={e=>{const g=gesture.current;if(!g||g.id!==event.id||g.pointer!==e.pointerId)return;const el=scroll.current;const distance=e.clientX-g.x+(el?.scrollLeft??0)-g.scrollLeft;if(Math.abs(distance)>4)g.moved=true;if(!g.moved)return;if(el){const rect=el.getBoundingClientRect();if(e.clientX>rect.right-24)el.scrollLeft+=24;else if(e.clientX<rect.left+LABEL+24)el.scrollLeft-=24;}const delta=e.clientX-g.x+(el?.scrollLeft??0)-g.scrollLeft;g.next=Math.min(horizon,Math.max(lower,g.month+Math.round(delta/g.cell)));setPreview({id:g.id,month:g.next});}}
        onPointerUp={e=>{const g=gesture.current;if(!g||g.id!==event.id||g.pointer!==e.pointerId)return;gesture.current=null;setPreview(null);suppressClick.current=g.moved;if(g.moved)move(g.id,g.next);}}
        onPointerCancel={cancelGesture}
        onLostPointerCapture={()=>{gesture.current=null;setPreview(null);}}
       >{event.type==='unemployment'&&<i className="trackDuration" aria-hidden="true" style={{width:Math.min(100,duration*CELL/width*100)+'%'}}/>}<strong>{eventTitle(event)}</strong><span>第 {at} 月{event.type==='unemployment'?`–${at+duration-1} 月`:''}{locked?' · 已鎖定':''}</span></button>;
      })}
     </div>;
    })}
   </div>
  </div>
 </section>;
}
