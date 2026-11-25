'use client';
import { useMemo, useState } from 'react';
import type { ProjectV1 } from '@/domain/model';
import type { MigratedProject } from '@/domain/migration';
import { simulate } from '@/domain/engine';
import { exportProject } from '@/storage/project';
import { useModalFocus } from './FinancialForms';
import { userMessage } from '../messages';

export function MigrationPreview({source,target,month,onConfirm,onClose}:{source:ProjectV1;target:MigratedProject;month:number;onConfirm:()=>void;onClose:()=>void}){
 const ref=useModalFocus(true,onClose),[backupReady,setBackupReady]=useState(false),[error,setError]=useState('');
 const previews=useMemo(()=>source.scenarios.map((scenario,i)=>{
  const at=Math.min(month,(90-scenario.profile.age)*12),before=simulate(scenario,at)[at],after=simulate(target.scenarios[i],at)[at];
  return {id:scenario.id,name:scenario.name,at,historyCount:scenario.history.length,equal:Object.entries(before).every(([key,value])=>after[key as keyof typeof before]===value)};
 }),[source,target,month]);
 function backup(){
  try{
   const url=URL.createObjectURL(new Blob([exportProject(source)],{type:'application/json'}));
   const anchor=document.createElement('a');anchor.href=url;anchor.download='life-studio-v1-before-upgrade.json';anchor.click();
   setTimeout(()=>URL.revokeObjectURL(url),5000);setBackupReady(true);
  }catch(error){setError(userMessage(error,'備份失敗'));}
 }
 return <section ref={ref} className="editor" role="dialog" aria-modal="true" aria-label="新版模型轉換預覽"><div className="migrationPreview">
  <h2>轉換整個專案至新版模型</h2><p>所有人生與歷史參數一起轉換，保留分支關係。原有支出不拆租金：新增月租金為 0，既有負債先維持固定。</p>
  <p>引擎 1.0.0 → 2.0.0。轉換後可設定租金、負債還款與薪資事件；不會自動儲存。若要還原舊格式，請匯入原始備份。</p>
  <div className="previewRows">{previews.map(row=><p key={row.id}><strong>{row.name}</strong> · 第 {row.at} 月：{row.equal?'轉換前後財務結果一致':'結果不一致，請取消'} · 保留 {row.historyCount} 筆歷史</p>)}</div>
  <button type="button" onClick={backup}>下載原始 V1 備份</button>
  <p className="muted">{backupReady?'已發出備份下載，請確認檔案已保存在裝置上。':'請先下載原始備份，再確認轉換。'}</p>
  {error&&<p role="alert">{error}</p>}
  <div className="actions"><button type="button" onClick={onClose}>取消轉換</button><button type="button" className="primary" disabled={!backupReady||!!error||previews.some(row=>!row.equal)} onClick={onConfirm}>確認轉換</button></div>
 </div></section>;
}
