'use client';
import { EventImpactPreview } from './EventImpactPreview';
import { useEffect, useRef, useState } from 'react';
import type { DebtSchedule, LifeEvent, Profile, Scenario } from '@/domain/model';

const amount=(data:FormData,key:string)=>Math.round(Number(data.get(key))*100);
const numeric=(data:FormData,key:string)=>Number(data.get(key));
// Preserve the stored floating-point parameter when its displayed percentage was not changed.
const annualRate=(data:FormData,key:string,original:number)=>numeric(data,key)===original*100?original:numeric(data,key)/100;
export function eventTitle(event:LifeEvent):string {
 switch(event.type){
  case 'buyHouse':return '建立自己的家';
  case 'unemployment':return '職涯暫停 '+event.duration+' 個月';
  case 'rentChange':return '調整月租金';
  case 'incomeChange':return '調整正常月薪';
 }
}

export function ProfileForm({scenario,onSave,onDirty}:{scenario:Scenario;onSave:(profile:Profile)=>void;onDirty:()=>void}){
 const isV2=scenario.engineVersion==='2.0.0';
 const [schedules,setSchedules]=useState<DebtSchedule[]>(()=>isV2?structuredClone(scenario.profile.debtSchedules):[]);
 function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();const data=new FormData(event.currentTarget);
  const base={...scenario.profile,age:numeric(data,'age'),cash:amount(data,'cash'),assets:amount(data,'assets'),debt:amount(data,'debt'),income:amount(data,'income'),expenses:amount(data,'expenses')};
  if(isV2)onSave({...base,rent:amount(data,'rent'),debtSchedules:schedules.map((row,i)=>({id:row.id,openingBalance:amount(data,`loan-${i}-balance`),annualRate:annualRate(data,`loan-${i}-rate`,row.annualRate),firstPaymentMonth:numeric(data,`loan-${i}-start`),termMonths:numeric(data,`loan-${i}-term`)}))});
  else onSave(base);
 }
 return <form onSubmit={submit} onChange={onDirty}><fieldset disabled={scenario.parentId!==null}>
  <label>初始年齡<input required name="age" type="number" min="18" max="89" defaultValue={scenario.profile.age}/></label>
  {([['cash','現金'],['assets','其他資產'],['debt','既有負債'],['income','月收入'],['expenses',isV2?'生活費（不含租金）':'月支出']] as const).map(([key,label])=><label key={key}>{label}（元）<input required type="number" step=".01" min="0" max="10000000000" name={key} defaultValue={scenario.profile[key]/100}/></label>)}
  {isV2&&<><label>月租金（元）<input required name="rent" type="number" min="0" max="10000000000" step=".01" defaultValue={scenario.profile.rent/100}/></label>
   <h3>既有負債還款排程</h3><p className="muted">排程分配上方既有負債，不增加借款。未分配的部分維持固定；第一付款月之前不累息。生活費請勿再包含下列還款。</p>
   {schedules.map((row,i)=><div className="debtSchedule" key={row.id}>
    <h4>負債排程 {i+1}</h4>
    <label>排程 {i+1} 本金（元）<input name={`loan-${i}-balance`} type="number" min=".01" max="10000000000" step=".01" required defaultValue={row.openingBalance/100}/></label>
    <label>排程 {i+1} 年利率（%）<input name={`loan-${i}-rate`} type="number" min="0" max="30" step="any" required defaultValue={row.annualRate*100}/></label>
    <label>排程 {i+1} 第一付款月<input name={`loan-${i}-start`} type="number" min="1" max={(90-scenario.profile.age)*12} required defaultValue={row.firstPaymentMonth}/></label>
    <label>排程 {i+1} 付款期數<input name={`loan-${i}-term`} type="number" min="1" max="480" required defaultValue={row.termMonths}/></label>
    <button type="button" onClick={()=>{setSchedules(schedules.filter(item=>item.id!==row.id));onDirty();}}>移除排程 {i+1}</button>
   </div>)}
   <button type="button" disabled={schedules.length>=20} onClick={()=>{setSchedules([...schedules,{id:crypto.randomUUID(),openingBalance:0,annualRate:0,firstPaymentMonth:1,termMonths:12}]);onDirty();}}>新增負債排程</button>
  </>}
  <button className="primary" type="submit">更新基礎資料</button>
 </fieldset></form>;
}

/** Shared keyboard handling also used by the conversion preview. */
export function useModalFocus(open:boolean,onClose:()=>void,returnFocus:HTMLElement|null){
 const ref=useRef<HTMLElement>(null),closeRef=useRef(onClose);
 closeRef.current=onClose;
 useEffect(()=>{
  if(!open)return;
  const previous=returnFocus,element=ref.current;
  const controls=()=>Array.from(element?.querySelectorAll<HTMLElement>('input,button,select,[tabindex="0"]')??[]).filter(control=>!control.hasAttribute('disabled')&&!control.matches(':disabled'));
  controls()[0]?.focus();
  function keyboard(event:KeyboardEvent){
   if(event.key==='Escape'){event.preventDefault();closeRef.current();}
   if(event.key==='Tab'){
    const list=controls(),first=list[0],last=list.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
   }
  }
  element?.addEventListener('keydown',keyboard);
  return()=>{
   element?.removeEventListener('keydown',keyboard);
   // Chrome may clear activeElement as soon as the opener becomes inert. Restore only after
   // React removes inert, and never steal focus from a newer modal.
   requestAnimationFrame(()=>{
    if(previous?.isConnected&&!previous.closest('[inert]')&&!document.querySelector('[aria-modal="true"]'))previous.focus();
   });
  };
 },[open,returnFocus]);
 return ref;
}

export function EventEditor({editing,error,scenario,onSave,onClose,returnFocus,onDraftChange}:{onDraftChange:()=>void;editing:LifeEvent;error:string;returnFocus:HTMLElement|null;scenario:Scenario;onSave:(event:LifeEvent)=>void;onClose:()=>void}){
 const ref=useModalFocus(true,onClose,returnFocus);
 const [draft,setDraft]=useState<LifeEvent|null>(editing);
 function readEvent(data:FormData):LifeEvent{
  const base={id:editing.id,month:numeric(data,'month')};
  let next:LifeEvent;
  if(editing.type==='buyHouse'){
   const parameters={...base,type:'buyHouse' as const,price:amount(data,'price'),downPayment:amount(data,'downPayment'),annualRate:annualRate(data,'annualRate',editing.annualRate),termMonths:numeric(data,'termMonths')};
   next=scenario.engineVersion==='2.0.0'?{...parameters,version:2,stopRent:data.get('stopRent')==='on'}:{...parameters,version:1};
  }else if(editing.type==='unemployment')next={...base,version:1,type:'unemployment',duration:numeric(data,'duration'),replacementIncome:amount(data,'replacementIncome')};
  else next={...base,version:1,type:editing.type,amount:amount(data,'amount')};
  return next;
 }
 function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const next=readEvent(new FormData(event.currentTarget));onSave({...next,id:next.id||crypto.randomUUID()});}
 return <section ref={ref} className="editor" role="dialog" aria-modal="true" aria-label="事件設定"><div className="eventWorkspace"><form onSubmit={submit} onChange={event=>{onDraftChange();setDraft(event.currentTarget.checkValidity()?readEvent(new FormData(event.currentTarget)):null);}}>
  <h2>{eventTitle(editing)}</h2>
  <label>發生月份<input name="month" type="number" required min={(scenario.forkMonth??0)+1} max={(90-scenario.profile.age)*12} defaultValue={editing.month}/></label>
  {editing.type==='buyHouse'?<>
   {([['price','房屋總價（元）',editing.price/100],['downPayment','自備款（元）',editing.downPayment/100],['annualRate','年利率（%）',editing.annualRate*100],['termMonths','房貸期數（月）',editing.termMonths]] as const).map(([key,label,value])=><label key={key}>{label}<input name={key} type="number" required step={key==='termMonths'?1:key==='annualRate'?'any':.01} min={key==='termMonths'?1:key==='price'?.01:0} max={key==='annualRate'?30:key==='termMonths'?480:10000000000} defaultValue={value}/></label>)}
   {scenario.engineVersion==='2.0.0'&&<label className="checkboxLabel"><input name="stopRent" type="checkbox" defaultChecked={editing.version===2&&editing.stopRent}/>從購屋當月停止租金（同月租金事件仍優先）</label>}
  </>:editing.type==='unemployment'?<>
   <label>失業月數<input name="duration" required type="number" min="1" max="120" defaultValue={editing.duration}/></label>
   <label>期間每月替代收入（元）<input name="replacementIncome" required type="number" min="0" step=".01" max="10000000000" defaultValue={editing.replacementIncome/100}/></label>
  </>:<><label>{editing.type==='rentChange'?'新的月租金（元）':'新的正常月薪（元）'}<input name="amount" required type="number" min="0" max="10000000000" step=".01" defaultValue={editing.amount/100}/></label><p className="muted">從指定月份生效，直到下一次同類事件。{editing.type==='incomeChange'?'失業期間仍使用替代收入，結束後恢復當時正常月薪。':'設定新金額，不是額外加收。'}</p></>}
  {error&&<p role="alert" className="warning">{error}</p>}
  <div className="actions"><button type="button" onClick={onClose}>取消</button><button type="submit" className="primary">儲存事件</button></div>
 </form><EventImpactPreview scenario={scenario} event={draft}/></div></section>;
}
