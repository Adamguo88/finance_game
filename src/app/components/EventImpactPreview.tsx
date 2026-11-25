'use client';
import {useEffect,useState} from 'react';
import type {LifeEvent,Scenario} from '@/domain/model';
import {previewEvent,type EventPreviewRow} from '@/domain/event-preview';
import {userMessage} from '../messages';
const money=(amount:number)=>new Intl.NumberFormat('zh-TW',{style:'currency',currency:'TWD',maximumFractionDigits:2}).format(amount/100);
export function EventImpactPreview({scenario,event}:{scenario:Scenario;event:LifeEvent|null}){
 const [result,setResult]=useState<{source:LifeEvent;rows?:EventPreviewRow[];error?:string}|null>(null);
 useEffect(()=>{
  if(!event)return;
  const timer=setTimeout(()=>{try{setResult({source:event,rows:previewEvent(scenario,event)});}catch(error){setResult({source:event,error:userMessage(error,'無法預覽此事件')});}},150);
  return()=>clearTimeout(timer);
 },[scenario,event]);
 const current=result?.source===event?result:null;
 return <section className="impactPreview" aria-label="事件影響預覽" aria-live="polite">
  <h3>先看影響，再做選擇</h3><p>尚未儲存。與同月原方案比較，其他事件保持不變。</p>
  {!event?<p>請先填妥有效的事件參數。</p>:!current?<p>正在更新預覽…</p>:current.error?<p className="warning">{current.error}</p>:<table><caption>財務影響比較（新臺幣）</caption><thead><tr><th scope="col">項目</th><th scope="col">原方案</th><th scope="col">預覽</th><th scope="col">差額</th></tr></thead><tbody>{current.rows?.map((row,i)=><ImpactRows key={row.month} row={row} title={i===0?'事件當月':'90 歲終點'}/>)}</tbody></table>}
 </section>;
}
function ImpactRows({row,title}:{row:EventPreviewRow;title:string}){return <><tr className="impactMonth"><th colSpan={4}>{title} · 第 {row.month} 月</th></tr>{([['cash','現金'],['debt','負債'],['netWorth','淨資產']] as const).map(([key,label])=><tr key={key}><th scope="row">{label}</th><td>{money(row.before[key])}</td><td>{money(row.after[key])}</td><td>{row.after[key]-row.before[key]>0?'+':''}{money(row.after[key]-row.before[key])}</td></tr>)}</>;}
