'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { create } from 'zustand';
import { initialProject, type Project, type Scenario, type LifeEvent, type Snapshot } from '@/domain/model';
import { simulate } from '@/domain/engine';
import { changeEvents, changeProfile, forkScenario, replaceScenario, parseProject } from '@/domain/scenarios';
import { saveProject, loadProject, exportProject, importProject } from '@/storage/project';
import { mapSnapshot } from '@/scene/mapper';
type Mode='編輯'|'體驗'|'平行人生';
const usePlayback=create<{month:number;playing:boolean;speed:number;setMonth:(m:number)=>void;setPlaying:(p:boolean)=>void;setSpeed:(s:number)=>void}>((set)=>({month:0,playing:false,speed:1,setMonth:month=>set({month}),setPlaying:playing=>set({playing}),setSpeed:speed=>set({speed})}));
const currency=(n:number)=>new Intl.NumberFormat('zh-TW',{style:'currency',currency:'TWD',maximumFractionDigits:2}).format(n/100);
const emptyHouse:LifeEvent={id:'',version:1,type:'buyHouse',month:1,price:1000000000,downPayment:200000000,annualRate:.025,termMonths:360};
function Scene({snapshot}:{snapshot:Snapshot}){
 const s=mapSnapshot(snapshot);
 return <svg viewBox="0 0 600 260" role="img" aria-label={s.home+'，'+s.work+(s.warning?'，現金不足':'')}>
 <defs><linearGradient id={'sky'+snapshot.month} x2="0" y2="1"><stop stopColor="#e8efe5"/><stop offset="1" stopColor="#faf5e8"/></linearGradient></defs>
 <rect width="600" height="260" rx="20" fill="#edf0e3"/><circle cx="500" cy="52" r="30" fill="#edc678"/>
 <path d="M0 185Q170 105 310 164T600 140V260H0Z" fill="#cad9bd"/><path d="M0 245L600 190" stroke="#f8f2df" strokeWidth="32"/>
 <g transform="translate(80 70)"><rect x="0" y="25" width="92" height="100" rx="6" fill={snapshot.employed?'#6a8474':'#b6b5aa'}/><path d="M12 44H80M12 67H80M12 90H80" stroke="#d9e6d7" strokeWidth="9"/><text x="46" y="148" textAnchor="middle" fontSize="14" fill="#3c5144">{s.work}</text></g>
 <g transform="translate(310 75)"><path d="M0 65L85 0L165 65Z" fill={snapshot.ownsHome?'#ae765c':'#9da89a'}/><path d="M18 64H147V138H18Z" fill="#fff8e7"/><rect x="76" y="90" width="28" height="48" fill="#739080"/><rect x="35" y="81" width="25" height="24" fill="#bdd8d5"/><text x="82" y="162" textAnchor="middle" fontSize="14" fill="#3c5144">{s.home}</text></g>
 <circle cx="245" cy="161" r="12" fill="#d9ae86"/><path d="M227 204V187Q245 165 263 187V204" fill="#496f5c"/>
 {s.warning&&<g><rect x="200" y="20" width="185" height="34" rx="17" fill="#a65342"/><text x="292" y="42" textAnchor="middle" fontSize="14" fill="white">現金不足 · 請檢視選擇</text></g>}
 </svg>;
}
function Metrics({s}:{s:Snapshot}){return <div className="metrics">{[['可動用現金',s.cash],['其他／房屋資產',s.assets],['淨資產',s.netWorth],['總負債',s.debt],['本月現金變化',s.cashFlow]].map(([label,value])=><div key={String(label)}><small>{label}</small><strong className={Number(value)<0?'negative':''}>{currency(Number(value))}</strong></div>)}</div>;}
export default function Studio(){
 const editorRef=useRef<HTMLElement>(null);
 const [hydrated,setHydrated]=useState(false);
 useEffect(()=>setHydrated(true),[]);
 const [project,setProject]=useState<Project>(()=>structuredClone(initialProject));
 const [active,setActive]=useState('original'),[mode,setMode]=useState<Mode>('編輯'),[message,setMessage]=useState('範例資料已就緒，從一張事件卡開始。');
 const [editing,setEditing]=useState<LifeEvent|null>(null),[branchName,setBranchName]=useState('另一種可能'),[compare,setCompare]=useState<string[]>(['original']),[busy,setBusy]=useState(false);
 const {month,playing,speed,setMonth,setPlaying,setSpeed}=usePlayback();
 const scenario=project.scenarios.find(s=>s.id===active)??project.scenarios[0];
 const horizon=(90-scenario.profile.age)*12;
 const selected=project.scenarios.filter(s=>compare.includes(s.id));
 const minHorizon=selected.length?Math.min(...selected.map(s=>(90-s.profile.age)*12)):horizon;
 const playbackHorizon=mode==='平行人生'?minHorizon:horizon;
 useEffect(()=>{
  if(!editing)return;
  const previous=document.activeElement as HTMLElement|null;
  const editor=editorRef.current;
  const controls=()=>Array.from(editor?.querySelectorAll<HTMLElement>('input, button, select')??[]).filter(el=>!el.hasAttribute('disabled'));
  controls()[0]?.focus();
  function keyboard(event:KeyboardEvent){
   if(event.key==='Escape'){event.preventDefault();setEditing(null);}
   if(event.key==='Tab'){
    const items=controls(),first=items[0],last=items.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
   }
  }
  editor?.addEventListener('keydown',keyboard);
  return()=>{editor?.removeEventListener('keydown',keyboard);previous?.focus();};
 },[editing]);
 const rows=useMemo(()=>simulate(scenario),[scenario]);const safeMonth=Math.min(month,playbackHorizon);const snapshot=rows[Math.min(month,horizon)];
 useEffect(()=>{if(!playing)return;const timer=setInterval(()=>{const m=usePlayback.getState().month;if(m>=playbackHorizon){setPlaying(false);return;}setMonth(m+1);},1000/speed);return()=>clearInterval(timer);},[playing,speed,playbackHorizon,setMonth,setPlaying]);
 function act(work:()=>void){try{work();}catch(e){setPlaying(false);setMessage(e instanceof Error?e.message:'操作失敗');}}
 function update(s:Scenario){setProject(replaceScenario(project,s));}
 async function persist(load=false){setBusy(true);setPlaying(false);try{if(load){const p=await loadProject();if(!p)throw new Error('尚無本機存檔');setProject(p);setActive(p.scenarios[0].id);setCompare(p.scenarios.slice(0,2).map(s=>s.id));setMonth(0);setEditing(null);}else await saveProject(project);setMessage(load?'已載入本機存檔。':'已存入此瀏覽器。建議另行匯出備份。');}catch(e){setMessage('存檔操作失敗：'+(e instanceof Error?e.message:String(e)));}finally{setBusy(false);}}
 function fork(){act(()=>{if(project.scenarios.length>=20)throw new Error('最多 20 個人生');const b=forkScenario(scenario,crypto.randomUUID(),branchName.trim(),safeMonth);setProject(parseProject({...project,scenarios:[...project.scenarios,b]}));setCompare([scenario.id,b.id]);setActive(b.id);setEditing(null);setPlaying(false);setMode('編輯');setMessage('已建立分支；此前歷史保留，之後的事件可自由編輯。');});}
 function saveEvent(event:React.FormEvent<HTMLFormElement>){event.preventDefault();if(!editing)return;const data=new FormData(event.currentTarget);act(()=>{const num=(key:string)=>Number(data.get(key));const common={id:editing.id||crypto.randomUUID(),version:1 as const,month:num('month')};const next:LifeEvent=editing.type==='buyHouse'?{...common,type:'buyHouse',price:Math.round(num('price')*100),downPayment:Math.round(num('downPayment')*100),annualRate:num('annualRate')/100,termMonths:num('termMonths')}:{...common,type:'unemployment',duration:num('duration'),replacementIncome:Math.round(num('replacementIncome')*100)};update(changeEvents(scenario,[...scenario.events.filter(e=>e.id!==editing.id),next]));setEditing(null);setMessage('事件已更新，所有後續月份已重新計算。');});}
 function profileSubmit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();const data=new FormData(event.currentTarget);act(()=>{const profile={...scenario.profile};for(const key of ['cash','assets','debt','income','expenses'] as const)profile[key]=Math.round(Number(data.get(key))*100);profile.age=Number(data.get('age'));const next=changeProfile(scenario,profile);update(next);setMonth(Math.min(month,(90-profile.age)*12));setMessage('已保留新版基礎資料，既有分支不受影響。');});}
 useEffect(()=>{if(month>playbackHorizon){setMonth(playbackHorizon);setPlaying(false);}},[month,playbackHorizon,setMonth,setPlaying]);
 if(!hydrated)return <main><p role="status">正在準備你的人生工作室…</p></main>;
 return <main>
 <header><div className="brand">LIFE STUDIO<span>人生，沒有唯一的劇本。</span></div><div className="actions"><button disabled={busy} onClick={()=>persist()}>儲存</button><button disabled={busy} onClick={()=>persist(true)}>讀取</button><button onClick={()=>act(()=>{const url=URL.createObjectURL(new Blob([exportProject(project)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='life-studio.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);setMessage('已匯出完整人生參數。');})}>匯出</button><label className="fileButton">匯入<input aria-label="匯入人生存檔" type="file" accept=".json,application/json" onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;setPlaying(false);try{if(file.size>2000000)throw new Error('存檔不可超過 2 MB');const p=importProject(await file.text());setProject(p);setActive(p.scenarios[0].id);setCompare(p.scenarios.slice(0,2).map(s=>s.id));setMonth(0);setEditing(null);setMessage('匯入成功；可儲存到此瀏覽器。');}catch(error){setMessage('匯入失敗：'+(error instanceof Error?error.message:String(error)));}}}/></label></div></header>
 <div className="intro"><div><small>YOUR LIFE, YOUR CHOICES</small><h1>先體驗，再選擇。</h1><p>用一段平行人生，看見每個決定的影響。</p></div><div className="age"><strong>{scenario.profile.age+Math.floor(safeMonth/12)}</strong> 歲 <small>第 {safeMonth%12} 個月</small></div></div>
 <nav aria-label="人生模式">{(['編輯','體驗','平行人生'] as Mode[]).map(m=><button key={m} aria-pressed={mode===m} className={mode===m?'selected':''} onClick={()=>{setMode(m);setEditing(null);setPlaying(false);}}>{m}</button>)}</nav>
 <div className="workspace"><aside><label>目前人生<select aria-label="目前人生" value={active} onChange={e=>{setActive(e.target.value);setEditing(null);setPlaying(false);}}>{project.scenarios.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><p className="muted">{scenario.parentId?'分支點：第 '+scenario.forkMonth+' 月；此前事件已鎖定。':'原始人生 · 每次修改均保留資料版本'}</p>
 {mode==='編輯'&&<><details open><summary>基礎財務資料</summary><form key={scenario.id+scenario.profile.version} onSubmit={profileSubmit}><fieldset disabled={scenario.parentId!==null}><label>初始年齡<input required name="age" type="number" min="18" max="89" defaultValue={scenario.profile.age}/></label>{([['cash','現金'],['assets','其他資產'],['debt','既有負債'],['income','月收入'],['expenses','月支出']] as const).map(([key,label])=><label key={key}>{label}（元）<input required type="number" step=".01" min="0" max="10000000000" name={key} defaultValue={scenario.profile[key]/100}/></label>)}<button className="primary" type="submit">更新基礎資料</button></fieldset></form></details><h3>人生事件卡</h3><button className="eventCard" onClick={()=>{setPlaying(false);setEditing({...emptyHouse,month:Math.min(horizon,Math.max(safeMonth+1,(scenario.forkMonth??0)+1))});}}>⌂ 建立自己的家<span>房價、自備款與貸款</span></button><button className="eventCard" onClick={()=>{setPlaying(false);setEditing({id:'',version:1,type:'unemployment',month:Math.min(horizon,Math.max(safeMonth+1,(scenario.forkMonth??0)+1)),duration:6,replacementIncome:0});}}>◷ 職涯暫停<span>自行安排收入中斷</span></button></>}
 {mode==='體驗'&&<p>播放人生，觀察工作、住宅與現金變化。需要調整決策時，可暫停並建立另一種可能。</p>}
 <h3>另一種可能</h3><label>分支名稱<input aria-label="分支名稱" maxLength={80} value={branchName} onChange={e=>setBranchName(e.target.value)}/></label><button disabled={safeMonth>=horizon} onClick={fork}>從第 {safeMonth} 月建立分支</button>
 </aside><section className="center">
 {mode==='平行人生'?<><div className="compareSelect">{project.scenarios.map(s=><label key={s.id}><input type="checkbox" checked={compare.includes(s.id)} onChange={e=>setCompare(e.target.checked?[...compare,s.id]:compare.filter(id=>id!==s.id))}/>{s.name}</label>)}</div>{selected.length===0?<p>請選擇要比較的人生。</p>:<div className="comparisons">{selected.map(s=>{const row=simulate(s)[Math.min(safeMonth,(90-s.profile.age)*12)];return <article key={s.id}><h2>{s.name}</h2><p>第 {row.month} 月 · {s.profile.age+Math.floor(row.month/12)} 歲</p><Scene snapshot={row}/><Metrics s={row}/></article>;})}</div>}<p className="muted">比較相同經過月份；初始年齡不同時會顯示各自年齡。時間上限採最短人生期間。</p></>:<><div className="sceneTitle"><h2>{scenario.name}</h2><span>第 {safeMonth} 月 / {horizon}</span></div><Scene snapshot={snapshot}/><Metrics s={snapshot}/><div className="ledger"><span>月收入 {currency(snapshot.income)}</span><span>生活支出 {currency(snapshot.expenses)}</span><span>房貸本息 {currency(snapshot.payment)}</span><span>其中利息 {currency(snapshot.interest)}</span></div>{snapshot.gap&&<div role="alert" className="warning">現金缺口 {currency(-snapshot.cash)}。系統不會自動借款；可以建立分支，調整未來選擇。</div>}</>}
 <div className="timeline"><div><h3>人生時間軸</h3><span>{playing?'正在體驗':'時間已暫停'}</span></div><input aria-label="人生時間軸" type="range" min="0" max={mode==='平行人生'?minHorizon:horizon} value={Math.min(safeMonth,mode==='平行人生'?minHorizon:horizon)} onChange={e=>{setPlaying(false);setMonth(Number(e.target.value));}}/><div className="transport"><button onClick={()=>{setPlaying(false);setMonth(Math.max(0,safeMonth-1));}}>上一月</button><button className="primary" onClick={()=>{const limit=mode==='平行人生'?minHorizon:horizon;if(safeMonth>=limit)setMonth(0);setPlaying(!playing);}}>{playing?'暫停':'播放'}</button><button onClick={()=>{setPlaying(false);setMonth(Math.min(mode==='平行人生'?minHorizon:horizon,safeMonth+1));}}>下一月</button><label>速度<select aria-label="播放速度" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={1}>1×</option><option value={4}>4×</option><option value={12}>12×</option></select></label></div></div>
 <h3>已安排的人生事件</h3><div className="eventList">{[...scenario.events].sort((a,b)=>a.month-b.month).map(e=><article key={e.id}><div><small>第 {e.month} 月 · {scenario.profile.age+Math.floor(e.month/12)} 歲</small><strong>{e.type==='buyHouse'?'建立自己的家':'職涯暫停 '+e.duration+' 個月'}</strong></div>{mode==='編輯'&&<div><button disabled={e.month<=(scenario.forkMonth??-1)} onClick={()=>{setPlaying(false);setEditing(e);}}>編輯事件</button><button disabled={e.month<=(scenario.forkMonth??-1)} onClick={()=>act(()=>update(changeEvents(scenario,scenario.events.filter(item=>item.id!==e.id))))}>移除</button></div>}</article>)}{scenario.events.length===0&&<p className="muted">未來還是一張空白畫布。加入一個你想探索的選擇。</p>}</div>
 </section></div>
 {editing&&<section ref={editorRef} className="editor" role="dialog" aria-modal="true" aria-label="事件設定"><form key={editing.id+editing.type} onSubmit={saveEvent}><h2>{editing.type==='buyHouse'?'建立自己的家':'職涯暫停'}</h2><label>發生月份<input name="month" type="number" required min={(scenario.forkMonth??0)+1} max={horizon} defaultValue={editing.month}/></label>{editing.type==='buyHouse'?<>{([['price','房屋總價（元）',editing.price/100],['downPayment','自備款（元）',editing.downPayment/100],['annualRate','年利率（%）',editing.annualRate*100],['termMonths','房貸期數（月）',editing.termMonths]] as const).map(([key,label,value])=><label key={key}>{label}<input name={key} type="number" required step={key==='termMonths'?1:.01} min={key==='termMonths'?1:0} max={key==='annualRate'?30:key==='termMonths'?480:10000000000} defaultValue={value}/></label>)}</>:<><label>失業月數<input name="duration" required type="number" min="1" max="120" defaultValue={editing.duration}/></label><label>期間每月替代收入（元）<input name="replacementIncome" required type="number" min="0" step=".01" max="10000000000" defaultValue={editing.replacementIncome/100}/></label></>}<div className="actions"><button type="button" onClick={()=>setEditing(null)}>取消</button><button type="submit" className="primary">儲存事件</button></div></form></section>}
 <footer><p role="status">{message}</p><small>v0.1 · 金額以新臺幣呈現。固定薪資、固定房價與固定利率；未計稅費、通膨與投資報酬。既有負債暫不自動攤還；月支出在買房後維持原值。</small></footer>
 </main>;
}
