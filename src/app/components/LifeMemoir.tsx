'use client';
import {useMemo,useState} from 'react';
import type {Project} from '@/domain/model';
import {buildMemoir} from '../memoir';
import {useModalFocus} from './FinancialForms';
const money=(n:number)=>new Intl.NumberFormat('zh-TW',{style:'currency',currency:'TWD',maximumFractionDigits:2}).format(n/100);
export function LifeMemoir({project,active,month,onJump,onClose,returnFocus}:{project:Project;active:string;month:number;onJump:(id:string,month:number)=>void;onClose:()=>void;returnFocus:HTMLElement|null}){
 const ref=useModalFocus(true,onClose,returnFocus),[selected,setSelected]=useState(active),[range,setRange]=useState('all'),[kind,setKind]=useState('all'),[page,setPage]=useState(0);
 const scenario=project.scenarios.find(s=>s.id===selected)??project.scenarios[0],parentName=project.scenarios.find(s=>s.id===scenario.parentId)?.name??null;
 const memoir=useMemo(()=>buildMemoir(scenario,month,parentName),[scenario,month,parentName]);
 const entries=memoir.entries.filter(e=>(range==='all'||(range==='past'?!e.future:e.future))&&(kind==='all'||e.kind===kind)),pages=Math.max(1,Math.ceil(entries.length/20)),current=Math.min(page,pages-1);
 return <section ref={ref} className="editor" role="dialog" aria-modal="true" aria-label="人生回憶錄"><div className="memoirPanel"><p className="eyebrow">YOUR LIFE, YOUR CHOICES</p><h2>每一種選擇，都有它的脈絡。</h2><p>這是已套用資料的確定性模型摘要，不代表真實發生，也不作人生成功評分。未來排程另有標記；同月快照包含全部事件，不能當作單張卡片的獨立貢獻。</p>
 <div className="memoirTools"><label>回顧人生<select aria-label="回顧人生" value={selected} onChange={e=>{setSelected(e.target.value);setPage(0);}}>{project.scenarios.map(s=><option key={s.id} value={s.id}>{s.name} · {s.engineVersion}</option>)}</select></label><label>紀錄範圍<select aria-label="紀錄範圍" value={range} onChange={e=>{setRange(e.target.value);setPage(0);}}><option value="all">全部模擬與排程</option><option value="past">目前位置以前</option><option value="future">未來模擬排程</option></select></label><label>紀錄類別<select aria-label="紀錄類別" value={kind} onChange={e=>{setKind(e.target.value);setPage(0);}}><option value="all">全部紀錄</option><option value="event">使用者事件</option><option value="branch">分支脈絡</option><option value="gap">現金狀態</option></select></label></div>
 <p className="memoirContext"><strong>{scenario.name}</strong> · 引擎 {memoir.engineVersion} · 修訂 {memoir.revision} · 初始資料 v{memoir.profileVersion} · 此方案目前檢視至第 {memoir.through} 月</p><p className="muted">保留 {scenario.history.length} 筆參數修改歷史。摘要使用目前版本重建，不是各次修改的實際發生日期。{month>memoir.horizon?'此方案期間較短，回顧範圍依其終點顯示。':''}</p>
 {!scenario.events.length&&<p className="memoirEmpty">尚無安排事件。只顯示起點、快照狀態與模型終點，不會替你新增人生事件。</p>}
 <ol className="memoirEntries" aria-label="人生摘要紀錄">{entries.slice(current*20,current*20+20).map(entry=><li key={scenario.id+':'+entry.id} data-memoir-entry={entry.id}><div className="memoirStamp">第 {entry.month} 月 · {scenario.profile.age+Math.floor(entry.month/12)} 歲 {entry.month%12} 個月<span>{entry.future?'未來模擬排程':'目前位置以前的模擬'}{entry.locked?' · 承接且已鎖定':''}</span></div><h3>{entry.title}</h3><p>{entry.description}</p><dl><div><dt>同月現金</dt><dd>{money(entry.snapshot.cash)}</dd></div><div><dt>同月總負債</dt><dd>{money(entry.snapshot.debt)}</dd></div><div><dt>本月現金變化</dt><dd>{money(entry.snapshot.cashFlow)}</dd></div></dl><details><summary>資料來源</summary><p>{scenario.name}（{scenario.id}） · {entry.origin} · 引擎 {scenario.engineVersion} · revision {scenario.revision}</p></details><button onClick={()=>onJump(scenario.id,entry.month)} aria-label={`查看第 ${entry.month} 月：${entry.title}`}>回到此方案的第 {entry.month} 月</button></li>)}</ol>
 {!entries.length&&<p className="memoirEmpty">這個篩選範圍沒有紀錄；可選全部紀錄查看已排的未來。</p>}
 <div className="memoirPages"><button disabled={current===0} onClick={()=>setPage(current-1)}>上一頁紀錄</button><span>第 {current+1} / {pages} 頁 · 共 {entries.length} 筆</span><button disabled={current>=pages-1} onClick={()=>setPage(current+1)}>下一頁紀錄</button><button onClick={onClose}>關閉回憶錄</button></div>
 </div></section>;
}
