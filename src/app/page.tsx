'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { create } from 'zustand';
import { initialProject, type Project, type Scenario, type LifeEvent, type Profile, type ProjectV1, type Snapshot, type SnapshotV2 } from '@/domain/model';
import { simulateForDisplay as simulate } from '@/domain/engine';
import { migrateProject, type MigratedProject } from '@/domain/migration';
import { ProfileForm, EventEditor, eventTitle } from './components/FinancialForms';
import { Welcome, LifeSetup } from './components/Journey';
import { EventLibrary } from './components/EventLibrary';
import { createEventDraft, type EventType } from './events/catalog';
import { EventTimeline } from './components/EventTimeline';
import { rescheduleEvent } from '@/domain/timeline';
import { MigrationPreview } from './components/MigrationPreview';
import { userMessage } from './messages';
import { changeEvents, changeProfile, forkScenario, replaceScenario, parseProject } from '@/domain/scenarios';
import { saveProject, loadProject, exportProject, importProject } from '@/storage/project';
import { LifeWorld as Scene, type WorldArea } from '@/scene/LifeWorld';
import {usePresentation} from '@/presentation/use-presentation';
import { WorldInspector } from './components/WorldInspector';
type Mode='編輯'|'體驗'|'平行人生';
const usePlayback=create<{month:number;playing:boolean;speed:number;setMonth:(m:number)=>void;setPlaying:(p:boolean)=>void;setSpeed:(s:number)=>void}>((set)=>({month:0,playing:false,speed:1,setMonth:month=>set({month}),setPlaying:playing=>set({playing}),setSpeed:speed=>set({speed})}));
const currency=(n:number)=>new Intl.NumberFormat('zh-TW',{style:'currency',currency:'TWD',maximumFractionDigits:2}).format(n/100);
function Metrics({s}:{s:Snapshot}){return <div className="metrics">{[['可動用現金',s.cash],['其他／房屋資產',s.assets],['淨資產',s.netWorth],['總負債',s.debt],['本月現金變化',s.cashFlow]].map(([label,value])=><div key={String(label)}><small>{label}</small><strong className={Number(value)<0?'negative':''}>{currency(Number(value))}</strong></div>)}</div>;}
function Ledger({snapshot:s,isV2}:{snapshot:SnapshotV2;isV2:boolean}){return <div className="ledger"><span>月收入 {currency(s.income)}</span><span>{isV2?'生活費（不含租金）':'生活支出'} {currency(isV2?s.livingExpenses:s.expenses)}</span>{isV2&&<span>月租金 {currency(s.rent)}</span>}<span>房貸本息 {currency(s.payment)}</span><span>其中利息 {currency(s.interest)}</span>{isV2&&<><span>其他負債本息 {currency(s.scheduledDebtPayment)}</span><span>其他負債利息 {currency(s.scheduledDebtInterest)}</span><span>未排程負債 {currency(s.unallocatedDebt)}</span></>}</div>;}
export default function Studio(){
 const [inspecting,setInspecting]=useState<WorldArea|null>(null);
 const [libraryCategory,setLibraryCategory]=useState('全部');
 const profileDetails=useRef<HTMLDetailsElement>(null);
 const editModeButton=useRef<HTMLButtonElement>(null);
 const [screen,setScreen]=useState<'welcome'|'setup'|'studio'>('welcome');
 const [setupReturn,setSetupReturn]=useState<'welcome'|'studio'>('welcome');
 const [hasSession,setHasSession]=useState(false),[workspaceSaved,setWorkspaceSaved]=useState(false),[created,setCreated]=useState(false);
 function showScreen(next:'welcome'|'setup'|'studio'){setScreen(next);try{sessionStorage.setItem('life-studio-screen',next==='studio'?'studio':'welcome');}catch{}}
 const [library,setLibrary]=useState(false);
 const [modalOpener,setModalOpener]=useState<HTMLElement|null>(null);
 const [migration,setMigration]=useState<{source:ProjectV1;target:MigratedProject}|null>(null);
 const storageOpener=useRef<HTMLElement|null>(null);
 const [profileDirty,setProfileDirty]=useState(false);
 const [workspaceRevision,setWorkspaceRevision]=useState(0);
 const [hydrated,setHydrated]=useState(false);
 useEffect(()=>{try{if(sessionStorage.getItem('life-studio-screen')==='studio'){setScreen('studio');setHasSession(true);}}catch{}setHydrated(true);},[]);
 const [project,setProject]=useState<Project>(()=>structuredClone(initialProject));
 const [active,setActive]=useState('original'),[mode,setMode]=useState<Mode>('編輯'),[message,setMessage]=useState('從你的起點開始，或先探索範例人生。');
 const [editorError,setEditorError]=useState('');
 const [editing,setEditing]=useState<LifeEvent|null>(null),[branchName,setBranchName]=useState('另一種可能'),[compare,setCompare]=useState<string[]>(['original']),[busy,setBusy]=useState(false);
 const {month,playing,speed,setMonth,setPlaying,setSpeed}=usePlayback();
 useEffect(()=>{
  if(busy)return;
  const opener=storageOpener.current;storageOpener.current=null;
  if(opener)requestAnimationFrame(()=>{if(opener.isConnected&&!opener.closest('[inert]')&&!document.querySelector('[aria-modal="true"]'))opener.focus();});
 },[busy]);
 const scenario=project.scenarios.find(s=>s.id===active)??project.scenarios[0];
 const horizon=(90-scenario.profile.age)*12;
 const selected=project.scenarios.filter(s=>compare.includes(s.id));
 const minHorizon=selected.length?Math.min(...selected.map(s=>(90-s.profile.age)*12)):horizon;
 const playbackHorizon=mode==='平行人生'?minHorizon:horizon;
 const rows=useMemo(()=>simulate(scenario),[scenario]);const safeMonth=Math.min(month,playbackHorizon);const snapshot=rows[Math.min(month,horizon)];
 const presentationScenarios=useMemo(()=>mode==='平行人生'?project.scenarios.filter(s=>compare.includes(s.id)):[scenario],[project,mode,compare,scenario]);
 const presentation=usePresentation({scope:workspaceRevision+':'+screen+':'+mode+':'+active+':'+compare.join(','),month:safeMonth,playing:playing&&screen==='studio'&&!busy&&!editing&&!migration&&!library&&!inspecting,speed,reduced:false},presentationScenarios,setPlaying,workspaceRevision);
 useEffect(()=>{if(!playing)return;const timer=setInterval(()=>{const m=usePlayback.getState().month;if(m>=playbackHorizon){setPlaying(false);return;}setMonth(m+1);},1000/speed);return()=>clearInterval(timer);},[playing,speed,playbackHorizon,setMonth,setPlaying]);
 function act(work:()=>void){try{work();}catch(e){setPlaying(false);setMessage(userMessage(e));}}
 function checkDraft(){if(!profileDirty)return true;setPlaying(false);setMessage('請先按「更新基礎資料」套用表單，或選擇「還原未套用資料」。');return false;}
 function startStorage(){storageOpener.current=document.activeElement instanceof HTMLElement?document.activeElement:null;setBusy(true);setPlaying(false);}
 function update(s:Scenario){const next=replaceScenario(project,s);setProject(next);setWorkspaceSaved(false);}
 async function persist(load=false){if(!checkDraft())return;startStorage();try{if(load){const p=await loadProject();if(!p)throw new Error('尚無本機存檔');setProject(p);setProfileDirty(false);setWorkspaceRevision(v=>v+1);setActive(p.scenarios[0].id);setCompare(p.scenarios.slice(0,2).map(s=>s.id));setMonth(0);setEditing(null);setMigration(null);}else await saveProject(project);setWorkspaceSaved(true);setHasSession(true);showScreen('studio');setMessage(load?'已載入本機存檔。':'已存入此瀏覽器。建議另行匯出備份。');}catch(e){setMessage('存檔操作失敗：'+userMessage(e));}finally{setBusy(false);}}
 function fork(){act(()=>{if(!checkDraft())return;if(project.scenarios.length>=20)throw new Error('最多 20 個人生');const b=forkScenario(scenario,crypto.randomUUID(),branchName.trim(),safeMonth);setProject(parseProject({...project,scenarios:[...project.scenarios,b]}));setWorkspaceSaved(false);setCompare([scenario.id,b.id]);setActive(b.id);setProfileDirty(false);setEditing(null);setPlaying(false);setMode('編輯');setMessage('已建立分支；此前歷史保留，之後的事件可自由編輯。');});}
 function saveEvent(next:LifeEvent){try{update(changeEvents(scenario,[...scenario.events.filter(e=>e.id!==editing?.id),next]));setEditing(null);setEditorError('');setMessage('事件已更新，所有後續月份已重新計算。');}catch(error){setEditorError(userMessage(error,'事件設定無效'));}}
 function saveProfile(profile:Profile){act(()=>{update(changeProfile(scenario,profile));setProfileDirty(false);setMonth(Math.min(month,(90-profile.age)*12));setMessage('已保留新版基礎資料，既有分支不受影響。');});}
 function previewMigration(){setModalOpener(document.activeElement instanceof HTMLElement?document.activeElement:null);act(()=>{if(project.schemaVersion!==1)throw new Error('專案已使用新版格式');if(profileDirty)throw new Error('請先按「更新基礎資料」保存表單內容，再升級模型。');setPlaying(false);setEditing(null);setMigration({source:structuredClone(project),target:migrateProject(project)});});}
 function confirmMigration(){act(()=>{if(!migration)return;setProject(parseProject(migration.target));setWorkspaceSaved(false);setProfileDirty(false);setWorkspaceRevision(v=>v+1);setMigration(null);setMessage('已轉換新版模型，尚未儲存；原始備份可還原舊格式。');});}
 function openEditor(event:LifeEvent){if(!checkDraft())return;setModalOpener(document.activeElement instanceof HTMLElement?document.activeElement:null);setEditorError('');setPlaying(false);setEditing(event);}
 async function handleImport(e:React.ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];e.target.value='';if(!file||!checkDraft())return;startStorage();try{if(file.size>2000000)throw new Error('存檔不可超過 2 MB');const p=importProject(await file.text());setProject(p);setWorkspaceSaved(false);setCreated(false);setHasSession(true);showScreen('studio');setProfileDirty(false);setWorkspaceRevision(v=>v+1);setActive(p.scenarios[0].id);setCompare(p.scenarios.slice(0,2).map(s=>s.id));setMonth(0);setEditing(null);setMigration(null);setMessage('匯入成功；可儲存到此瀏覽器。');}catch(error){setMessage('匯入失敗：'+userMessage(error));}finally{setBusy(false);}}
 function enterProject(p:Project,isCreated=false){setProject(p);setActive(p.scenarios[0].id);setCompare([p.scenarios[0].id]);setMonth(0);setPlaying(false);setMode('編輯');setEditing(null);setMigration(null);setLibrary(false);setProfileDirty(false);setWorkspaceRevision(v=>v+1);setWorkspaceSaved(false);setHasSession(true);setCreated(isCreated);setMessage(isCreated?'人生起點已建立，工作尚未儲存。從一張事件卡開始探索。':'範例資料已就緒，從一張事件卡開始。');showScreen('studio');}
 function returnHome(){if(!checkDraft())return;setPlaying(false);setMessage('目前工作保留在此分頁，返回即可繼續；重新整理後請讀取本機存檔。');showScreen('welcome');}
 function beginEvent(type:EventType){act(()=>{if(!checkDraft())return;openEditor(createEventDraft(type,scenario,safeMonth));});}
 function openLibrary(){if(!checkDraft())return;setModalOpener(document.activeElement instanceof HTMLElement?document.activeElement:null);setPlaying(false);setLibraryCategory('全部');setLibrary(true);}
 function inspectWorld(area:WorldArea){if(!checkDraft())return;setPlaying(false);setModalOpener(document.activeElement instanceof HTMLElement?document.activeElement:null);setInspecting(area);}
 function configureArea(){const area=inspecting;setInspecting(null);setMode('編輯');if(area==='finance'){setCreated(false);requestAnimationFrame(()=>requestAnimationFrame(()=>{if(profileDetails.current){profileDetails.current.open=true;profileDetails.current.querySelector('summary')?.focus();}}));}else{setModalOpener(editModeButton.current);setLibraryCategory(area==='home'?'住宅':'職涯');setLibrary(true);}}
 function chooseTemplate(type:EventType){act(()=>{const event=createEventDraft(type,scenario,safeMonth);setEditorError('');setLibrary(false);setEditing(event);});}
 useEffect(()=>{setEditorError('');},[editing]);
 useEffect(()=>{if(month>playbackHorizon){setMonth(playbackHorizon);setPlaying(false);}},[month,playbackHorizon,setMonth,setPlaying]);
 if(!hydrated)return <main><p role="status">正在準備你的人生工作室…</p></main>;
 if(screen==='welcome')return <Welcome world={<Scene snapshot={simulate(initialProject.scenarios[0],0)[0]}/>} busy={busy} message={message} canResume={hasSession} onResume={()=>showScreen('studio')} onNew={()=>{setSetupReturn('welcome');showScreen('setup');}} onExample={()=>enterProject(structuredClone(initialProject))} onLoad={()=>persist(true)} onImport={handleImport}/>;
 if(screen==='setup')return <LifeSetup onComplete={p=>enterProject(p,true)} onCancel={()=>showScreen(setupReturn)} world={s=><Scene snapshot={s}/>}/>;
 return <main className={'studio '+(mode==='體驗'?'experienceStudio':'')}>
 <div inert={!!editing||!!migration||library||!!inspecting||busy} aria-busy={busy}>
 <header><div className="brand">LIFE STUDIO<span>人生，沒有唯一的劇本。</span></div><span className="workspaceState">{profileDirty?'表單尚未套用':workspaceSaved?'已儲存至本機':'工作尚未儲存'}</span><div className="actions"><button onClick={returnHome}>首頁</button><button disabled={busy} onClick={()=>persist()}>儲存</button><button disabled={busy} onClick={()=>persist(true)}>讀取</button>{project.schemaVersion===1&&<button disabled={busy} onClick={previewMigration}>升級財務模型</button>}<button onClick={()=>act(()=>{const url=URL.createObjectURL(new Blob([exportProject(project)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='life-studio.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);setMessage(profileDirty?'已匯出已套用的人生參數；表單草稿尚未套用。':'已匯出完整人生參數。');})}>匯出</button><label className="fileButton">匯入<input aria-label="匯入人生存檔" type="file" accept=".json,application/json" onChange={handleImport}/></label></div></header>
 <div className="intro"><div><small>YOUR LIFE, YOUR CHOICES</small><h1>先體驗，再選擇。</h1><p>用一段平行人生，看見每個決定的影響。</p></div><div className="age">{mode==='平行人生'?<><strong>{safeMonth}</strong> 個月 <small>共同時間位置</small></>:<><strong>{scenario.profile.age+Math.floor(Math.min(month,horizon)/12)}</strong> 歲 <small>第 {Math.min(month,horizon)%12} 個月</small></>}</div></div>
 <p className="engineVersion">財務引擎 {scenario.engineVersion} · {scenario.engineVersion==='2.0.0'?'生活費與租金分列；負債排程不重複計債':project.schemaVersion===1?'原有支出與固定既有負債，升級後可設定還款':'此方案沿用 V1，混合版本專案不提供再次轉換'}</p>
 <nav aria-label="人生模式">{(['編輯','體驗','平行人生'] as Mode[]).map(m=><button key={m} ref={m==='編輯'?editModeButton:undefined} aria-pressed={mode===m} className={mode===m?'selected':''} onClick={()=>{if(!checkDraft())return;setMode(m);setProfileDirty(false);setEditing(null);setPlaying(false);}}>{m}</button>)}</nav>
 <div className="workspace"><aside><label>目前人生<select aria-label="目前人生" value={active} onChange={e=>{if(!checkDraft())return;setActive(e.target.value);setProfileDirty(false);setEditing(null);setPlaying(false);}}>{project.scenarios.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><p className="muted">{scenario.parentId?'分支點：第 '+scenario.forkMonth+' 月；此前事件已鎖定。':'原始人生 · 每次修改均保留資料版本'}</p>
 {mode==='編輯'&&<><details ref={profileDetails} open={!created}><summary>基礎財務資料</summary><ProfileForm key={workspaceRevision+scenario.id+JSON.stringify(scenario.profile)} scenario={scenario} onSave={saveProfile} onDirty={()=>{setProfileDirty(true);setPlaying(false);}}/>{profileDirty&&<div><p className="muted">表單尚未套用，請按「更新基礎資料」。</p><button type="button" onClick={()=>{setWorkspaceRevision(v=>v+1);setProfileDirty(false);setMessage('已還原未套用的基礎資料，方案與歷史未變更。');}}>還原未套用資料</button></div>}</details><h3>人生事件卡</h3><button className="libraryTrigger" onClick={openLibrary}>瀏覽事件庫<span>搜尋類別、了解效果並預覽</span></button><button className="eventCard" onClick={()=>beginEvent('buyHouse')}>⌂ 建立自己的家<span>房價、自備款與貸款</span></button><button className="eventCard" onClick={()=>beginEvent('unemployment')}>◷ 職涯暫停<span>自行安排收入中斷</span></button>{scenario.engineVersion==='2.0.0'&&<><button className="eventCard" onClick={()=>beginEvent('rentChange')}>調整月租金<span>指定月份起設定新租金</span></button><button className="eventCard" onClick={()=>beginEvent('incomeChange')}>調整正常月薪<span>加薪、轉職或調整薪資</span></button></>}</>}
 {mode==='體驗'&&<p>播放人生，觀察工作、住宅與現金變化。需要調整決策時，可暫停並建立另一種可能。</p>}
 <h3>另一種可能</h3><label>分支名稱<input aria-label="分支名稱" maxLength={80} value={branchName} onChange={e=>setBranchName(e.target.value)}/></label><button disabled={safeMonth>=horizon} onClick={fork}>從第 {safeMonth} 月建立分支</button>
 </aside><section className="center">
 {mode==='平行人生'?<><div className="compareSelect">{project.scenarios.map(s=><label key={s.id}><input type="checkbox" checked={compare.includes(s.id)} onChange={e=>setCompare(e.target.checked?[...compare,s.id]:compare.filter(id=>id!==s.id))}/>{s.name}</label>)}</div>{selected.length===0?<p>請選擇要比較的人生。</p>:<div className="comparisons">{selected.map(s=>{const row=simulate(s)[Math.min(safeMonth,(90-s.profile.age)*12)];return <article key={s.id}><h2>{s.name}</h2><p>第 {row.month} 月 · {s.profile.age+Math.floor(row.month/12)} 歲 · 引擎 {s.engineVersion}</p><Scene snapshot={row} cue={presentation.cue}/><Metrics s={row}/><Ledger snapshot={row} isV2={s.engineVersion==='2.0.0'}/></article>;})}</div>}<p className="muted">比較相同經過月份；初始年齡不同時會顯示各自年齡。時間上限採最短人生期間。</p></>:<><div className="sceneTitle"><h2>{scenario.name}</h2><span>第 {safeMonth} 月 / {horizon}</span></div><Metrics s={snapshot}/><div className="worldStage"><Scene snapshot={snapshot} onInspect={inspectWorld} cue={presentation.cue}/></div><Ledger snapshot={snapshot} isV2={scenario.engineVersion==='2.0.0'}/>{snapshot.gap&&<div role="alert" className="warning">現金缺口 {currency(-snapshot.cash)}。系統不會自動借款；可以建立分支，調整未來選擇。</div>}</>}
 <details className="presentationSettings"><summary>體驗設定</summary><div><label><input type="checkbox" checked={presentation.reduced} disabled={presentation.systemReduced} onChange={e=>presentation.setReduced(e.target.checked)}/>減少動態效果</label>{presentation.systemReduced&&<small>依系統偏好減少動態效果</small>}<label><input type="checkbox" checked={presentation.muted} onChange={()=>void presentation.toggleMuted()}/>靜音</label><label>音效音量<select aria-label="音效音量" value={presentation.volume} onChange={e=>{presentation.setVolume(Number(e.target.value));presentation.startAudio();}}><option value={0}>0%</option><option value={.1}>25%</option><option value={.2}>50%</option><option value={.4}>100%</option></select></label><button disabled={presentation.muted||presentation.volume===0} onClick={()=>void presentation.preview()}>試聽音效</button><small>事件音效只在連續播放經過事件月份時響起；回溯與跳月保持安靜。</small>{presentation.audioError&&<small>此裝置暫時無法啟用音效，仍可繼續規劃。</small>}</div></details>
 <div className="timeline"><div><h3>人生時間軸</h3><span>{playing?'正在體驗':'時間已暫停'}</span></div><input aria-label="人生時間軸" type="range" min="0" max={mode==='平行人生'?minHorizon:horizon} value={Math.min(safeMonth,mode==='平行人生'?minHorizon:horizon)} onChange={e=>{setPlaying(false);setMonth(Number(e.target.value));}}/><div className="transport"><button onClick={()=>{setPlaying(false);setMonth(Math.max(0,safeMonth-1));}}>上一月</button><button className="primary" onClick={()=>{presentation.startAudio();const limit=mode==='平行人生'?minHorizon:horizon;if(safeMonth>=limit)setMonth(0);setPlaying(!playing);}}>{playing?'暫停':'播放'}</button><button onClick={()=>{setPlaying(false);setMonth(Math.min(mode==='平行人生'?minHorizon:horizon,safeMonth+1));}}>下一月</button><label>速度<select aria-label="播放速度" value={speed} onChange={e=>setSpeed(Number(e.target.value))}><option value={1}>1×</option><option value={4}>4×</option><option value={12}>12×</option></select></label></div></div>
 <EventTimeline key={workspaceRevision+scenario.id+mode} scenario={scenario} month={Math.min(safeMonth,horizon)} editable={mode==='編輯'} onStart={()=>{if(!checkDraft())return false;setPlaying(false);return true;}} onMove={(id,nextMonth)=>act(()=>{if(!checkDraft())return;setPlaying(false);const next=rescheduleEvent(scenario,id,nextMonth);if(next!==scenario){update(next);setMessage('事件月份已更新，後續財務已重新計算。');}})} onOpen={openEditor} onSeek={at=>{setPlaying(false);setMonth(Math.min(at,playbackHorizon));}}/>
 <h3>已安排的人生事件</h3><div className="eventList">{[...scenario.events].sort((a,b)=>a.month-b.month).map(e=><article key={e.id}><div><small>第 {e.month} 月 · {scenario.profile.age+Math.floor(e.month/12)} 歲</small><strong>{eventTitle(e)}</strong></div>{mode==='編輯'&&<div><button disabled={e.month<=(scenario.forkMonth??-1)} onClick={()=>{setPlaying(false);openEditor(e);}}>編輯事件</button><button disabled={e.month<=(scenario.forkMonth??-1)} onClick={()=>act(()=>update(changeEvents(scenario,scenario.events.filter(item=>item.id!==e.id))))}>移除</button></div>}</article>)}{scenario.events.length===0&&<p className="muted">未來還是一張空白畫布。加入一個你想探索的選擇。</p>}</div>
 </section></div>
 </div>
 <footer aria-hidden={!!editing||!!migration||library||!!inspecting}><p role="status">{busy?'正在處理存檔，請稍候…':message}</p><small>v0.2 · 金額以新臺幣呈現。固定房價與利率；未計稅費、通膨與投資報酬。V1 維持原計算；V2 依使用者設定租金、薪資與既有負債還款。現金不足不會自動新增借款。</small></footer>
 {inspecting&&<WorldInspector area={inspecting} snapshot={snapshot} onClose={()=>setInspecting(null)} onConfigure={configureArea} returnFocus={modalOpener}/>}
 {library&&<EventLibrary initialCategory={libraryCategory} scenario={scenario} onChoose={chooseTemplate} onClose={()=>setLibrary(false)} returnFocus={modalOpener}/>}
 {editing&&<EventEditor key={editing.id+editing.type} editing={editing} onDraftChange={()=>setEditorError('')} returnFocus={modalOpener} error={editorError} scenario={scenario} onSave={saveEvent} onClose={()=>setEditing(null)}/>}
 {migration&&<MigrationPreview source={migration.source} returnFocus={modalOpener} target={migration.target} month={safeMonth} onConfirm={confirmMigration} onClose={()=>setMigration(null)}/>}
 </main>;
}
