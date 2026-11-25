'use client';
import {useId} from 'react';
import {useWorldRenderer} from './use-world-renderer';
import type {MotionCue} from '../presentation/motion';
import type {SnapshotV2} from '@/domain/model';
import {mapSnapshot} from './mapper';
import {AvatarModel,BenchModel,FinanceModel,HomeModel,OfficeModel,TreeModel,worldPalette as c} from './models';
export type WorldArea='home'|'work'|'finance'|'park';
const areas=[{id:'home',label:'住宅區',x:70,y:66},{id:'work',label:'工作區',x:35,y:40},{id:'finance',label:'財務小屋',x:25,y:75},{id:'park',label:'休憩公園',x:58,y:87}] as const;
export function LifeWorld({snapshot,onInspect,cue}:{snapshot:SnapshotV2;cue?:MotionCue;onInspect?:(area:WorldArea)=>void}){
 const s=mapSnapshot(snapshot),uid=useId(),sky=uid+'-sky';
 const rendering=useWorldRenderer({owned:snapshot.ownsHome,employed:snapshot.employed,mortgage:s.hasMortgage,gap:s.warning},cue);
 return <div className="lifeWorld" data-renderer={rendering.state} data-home={snapshot.ownsHome?'owned':'rented'} data-work={snapshot.employed?'active':'resting'}>
 {rendering.state==='loading'&&<span className="worldLoading">場景載入中 · 可先使用靜態世界</span>}
 <div ref={rendering.host} className="worldCanvas" aria-hidden="true"/>
 <svg viewBox="0 0 1000 500" role="img" aria-label={`${s.home}，${s.work}${s.hasMortgage?'，房貸還款中':''}${s.warning?'，現金不足':''}`}>
 <defs><radialGradient id={sky}><stop stopColor="#e2ead5"/><stop offset="1" stopColor="#f4f3e8" stopOpacity="0"/></radialGradient></defs>
 <ellipse cx="505" cy="284" rx="475" ry="246" fill={`url(#${sky})`}/><ellipse cx="502" cy="433" rx="350" ry="45" fill="#4c674b15"/>
 <g aria-hidden="true"><path d="M95 274L505 70L912 275L505 476Z" fill={c.grass}/><path d="M95 274L505 476V493L95 292Z" fill="#9db28a"/><path d="M505 476L912 275V292L505 493Z" fill="#88a478"/>
 <path d="M95 274L505 70L505 270Z" fill={c.grassLight}/><path d="M505 70L912 275L505 270Z" fill="#c5d3ab"/><path d="M505 270L912 275L505 476Z" fill={c.grassShade}/><path d="M95 274L505 270L505 476Z" fill="#d2debb"/>
 <path d="M360 202L680 362M265 354L651 161" fill="none" stroke="#b8c7a5" strokeWidth="31" strokeLinejoin="round"/><path d="M360 198L680 358M265 350L651 157" fill="none" stroke={c.path} strokeWidth="22" strokeLinejoin="round"/>
 <path d="M261 353L346 396L392 372" stroke="#dcd9bc" strokeWidth="12" fill="none"/>
 <TreeModel x={560} y={142} scale={.7}/><TreeModel x={630} y={171} scale={.55}/><TreeModel x={200} y={291} scale={.7}/><TreeModel x={779} y={318} scale={.7}/><TreeModel x={818} y={295} scale={.5}/>
 <g transform="translate(365 231)"><OfficeModel employed={snapshot.employed}/></g><g transform="translate(675 323)"><HomeModel owned={snapshot.ownsHome} mortgage={s.hasMortgage}/></g>
 <g transform="translate(315 358)"><FinanceModel attention={s.warning}/></g>
 <g transform="translate(544 404)"><BenchModel/></g><TreeModel x={617} y={420} scale={.65}/><TreeModel x={470} y={421} scale={.48}/>
 <g transform={snapshot.employed?'translate(515 287) scale(.82)':'translate(544 404) scale(.82)'}><AvatarModel resting={!snapshot.employed}/></g>
 <g fill="#e0d2a0"><path d="M216 317l10-5l11 5l-11 6Z"/><path d="M720 347l10-5l10 5l-10 5Z"/><path d="M422 382l9-4l9 4l-9 5Z"/></g>
 <g transform="translate(465 178)"><path d="M0 0V-33" stroke="#a38e6d" strokeWidth="3"/><path d="M0-33L29-22L0-12Z" fill="#e3bd75"/></g>
 </g>
 {!onInspect&&<g className="worldStaticLabels" fontSize="13" fill="#42604e" textAnchor="middle"><text x="365" y="301">{s.work}</text><text x="688" y="394">{s.home}</text></g>}
 </svg>
 {!onInspect&&<div className="worldLegend">{s.work} · {s.home}</div>}
 {onInspect&&areas.map(area=><button key={area.id} className={'worldHotspot '+(area.id==='finance'&&s.warning?'attention':'')} style={{left:area.x+'%',top:area.y+'%'}} onClick={()=>onInspect(area.id)} aria-label={area.label+'：'+(area.id==='home'?s.home:area.id==='work'?s.work:area.id==='finance'?(s.warning?'現金缺口':'資產與負債'):'休憩與選擇')}><span aria-hidden="true">{area.id==='home'?'⌂':area.id==='work'?'▥':area.id==='finance'?'◈':'♧'}</span>{area.label}</button>)}
 </div>;
}
