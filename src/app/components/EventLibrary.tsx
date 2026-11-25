'use client';
import {useState} from 'react';
import type {Scenario} from '@/domain/model';
import {eventCatalog,unavailableReason,type EventType} from '../events/catalog';
import {useModalFocus} from './FinancialForms';
export function EventLibrary({scenario,onChoose,onClose,returnFocus}:{scenario:Scenario;onChoose:(type:EventType)=>void;onClose:()=>void;returnFocus:HTMLElement|null}){
 const ref=useModalFocus(true,onClose,returnFocus),[query,setQuery]=useState(''),[category,setCategory]=useState('全部');
 const term=query.trim().toLocaleLowerCase('zh-TW');
 const items=eventCatalog.filter(item=>(category==='全部'||item.category===category)&&[item.name,item.description,item.parameters,item.keywords].join(' ').toLocaleLowerCase('zh-TW').includes(term));
 return <section ref={ref} className="editor" role="dialog" aria-modal="true" aria-label="人生事件庫"><div className="libraryPanel">
  <div className="libraryHeading"><div><small>YOUR NEXT CHOICE</small><h2>人生事件庫</h2><p>先了解選擇的影響，再設定屬於你的時間與金額。</p></div></div>
  <label>搜尋事件<input type="search" value={query} placeholder="例如：買房、加薪、搬家" onChange={e=>setQuery(e.target.value)}/></label>
  <div className="libraryFilters" role="group" aria-label="事件類別">{['全部','住宅','職涯'].map(value=><button key={value} aria-pressed={category===value} onClick={()=>setCategory(value)}>{value}</button>)}<button onClick={()=>{setQuery('');setCategory('全部');}}>重設篩選</button></div>
  <p className="muted" aria-live="polite">找到 {items.length} 種事件 · 選擇後仍需設定並儲存，不會自動加入人生。</p>
  <div className="libraryGrid">{items.map(item=>{const reason=unavailableReason(item.type,scenario);return <article key={item.type}>
   <small>{item.category}{item.type==='rentChange'||item.type==='incomeChange'?' · V2':''}</small><h3>{item.name}</h3><p>{item.description}</p><dl><dt>需要設定</dt><dd>{item.parameters}</dd><dt>會發生什麼</dt><dd>{item.effect}</dd></dl>
   <button className="primary" disabled={!!reason} aria-label={'設定：'+item.name} onClick={()=>onChoose(item.type)}>設定事件</button>{reason&&<p className="muted">{reason}</p>}
  </article>;})}</div>{items.length===0&&<p className="libraryEmpty">找不到符合的事件，試試其他關鍵字或重設篩選。</p>}
 <button className="libraryClose" onClick={onClose}>關閉事件庫</button></div></section>;
}
