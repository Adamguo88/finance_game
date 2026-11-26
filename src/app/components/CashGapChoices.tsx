'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {Project,Scenario,SnapshotV2} from '@/domain/model';
import {gapRunStart,previewGapBranch,type GapBranchPreview} from '../gap-plan';
import {eventTitle,useModalFocus} from './FinancialForms';
import {userMessage} from '../messages';
const money=(n:number)=>new Intl.NumberFormat('zh-TW',{style:'currency',currency:'TWD',maximumFractionDigits:2}).format(n/100);
export function CashGapChoices({project,scenario,rows,month,onClose,onRewind,onSource,onConfirm,returnFocus,error}:{project:Project;scenario:Scenario;rows:SnapshotV2[];month:number;onClose:()=>void;onRewind:(at:number)=>void;onSource:()=>void;onConfirm:(preview:GapBranchPreview)=>void;returnFocus:HTMLElement|null;error:string}){
 const ref=useModalFocus(true,onClose,returnFocus),start=useMemo(()=>gapRunStart(rows,month),[rows,month]),s=rows[month],minimum=scenario.forkMonth??0,maximum=Math.min(month,rows.length-2);
 const [name,setName]=useState('缺口前的另一種選擇'),[point,setPoint]=useState(String(Math.max(minimum,start-1))),[preview,setPreview]=useState<GapBranchPreview|null>(null),[problem,setProblem]=useState('');
 const previewRegion=useRef<HTMLElement>(null);
 useEffect(()=>{if(preview){previewRegion.current?.focus({preventScroll:true});previewRegion.current?.scrollIntoView({block:'nearest'});}},[preview]);
 const unavailable=project.scenarios.length>=20?'已達 20 個人生上限，仍可回溯或在目前排程中規劃。':minimum>maximum?'這個月份位於來源人生的鎖定歷史，請切換來源人生規劃更早的選擇。':'';
 function changed(){setPreview(null);setProblem('');}
 function prepare(e:React.FormEvent){e.preventDefault();try{setPreview(previewGapBranch(project,scenario.id,month,point.trim()===''?NaN:Number(point),name,crypto.randomUUID()));setProblem('');}catch(error){setPreview(null);setProblem(userMessage(error));}}
 const entries=[['現金缺口',money(-s.cash)],['可動用現金',money(s.cash)],['本月收入',money(s.income)],['生活支出',money(s.livingExpenses)],...(scenario.engineVersion==='2.0.0'?[['租金',money(s.rent)]]:[]),['房貸本息',money(s.mortgagePayment)],...(scenario.engineVersion==='2.0.0'?[['其他負債本息',money(s.scheduledDebtPayment)]]:[]),['本月現金變化',money(s.cashFlow)]];
 return <section ref={ref} className="editor" role="dialog" aria-modal="true" aria-label="現金缺口的選擇"><div className="gapChoices"><p className="eyebrow">YOUR NEXT CHOICE · 第 {month} 月</p><h2>留一點空間，看看另一種可能。</h2><p>目前缺口為 {money(-s.cash)}，這段連續缺口從第 {start} 月開始。數字來自目前設定的月度快照，不會自動新增借款。</p><dl className="gapLedger">{entries.map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl><p className="muted">現金餘額延續先前月份；本月現金變化亦包含購屋等一次性事件。{!s.employed?'目前處於職涯暫停期間。':''}</p><p>當月啟動事件：{scenario.events.filter(e=>e.month===month).map(eventTitle).join('、')||'無新事件，仍會按原有排程及收支模擬。'}</p>
 <div className="actions"><button onClick={onClose}>暫不變更</button><button onClick={()=>onRewind(Math.max(0,start-1))}>回到第 {Math.max(0,start-1)} 月檢視</button>{scenario.parentId&&<button onClick={onSource}>切換來源人生</button>}</div>
 <h3>先建立另一種可能</h3><p>建立分支不會改善數字，只複製原有條件與全部排程。確認後再選事件，查看影響預覽並決定是否儲存；原人生保持獨立。</p>{unavailable&&<p className="warning">{unavailable}</p>}
 <form onSubmit={prepare} noValidate><fieldset disabled={!!unavailable}><label>這次選擇的名稱<input maxLength={80} value={name} onChange={e=>{setName(e.target.value);changed();}}/></label><label>從第幾月結束建立分支<input type="number" min={minimum} max={maximum} step={1} value={point} onChange={e=>{setPoint(e.target.value);changed();}}/></label><p className="muted">{minimum<=maximum?`可選 ${minimum}–${maximum} 月；`:'此月沒有可用分支點，請切換來源人生。'}分支點及之前的事件鎖定，只能調整其後事件。若想避免較早決策的影響，請選更早的合法分支點。</p><button type="submit">預覽分支</button></fieldset></form>
 {(problem||error)&&<p role="alert">{problem||error}</p>}
 {preview&&<section ref={previewRegion} tabIndex={-1} aria-label="分支確認預覽" className="gapPreview"><h3>{name.trim()} · 第 {preview.forkMonth} 月分支</h3><p>此步尚未新增事件，以下數字應與原人生相同；確認前不會寫入方案或歷史。</p><div className="gapPreviewScroll"><table><thead><tr><th>經過月份</th><th>原人生現金</th><th>分支現金</th><th>分支總負債</th></tr></thead><tbody>{preview.rows.map(row=><tr key={row.month}><th>第 {row.month} 月</th><td>{money(row.before.cash)}</td><td>{money(row.after.cash)}</td><td>{money(row.after.debt)}</td></tr>)}</tbody></table></div><button className="primary" onClick={()=>onConfirm(preview)}>確認建立分支並規劃事件</button><p className="muted">會新增一個尚未儲存的分支，接著開啟現有事件庫。事件仍需另行預覽與儲存；不會自動覆寫本機存檔。</p></section>}
 </div></section>;
}
