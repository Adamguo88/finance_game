import {it,expect} from 'vitest';
import {initialProject} from '../src/domain/model';
import {migrateProject} from '../src/domain/migration';
import {createLifeProject} from '../src/domain/setup';
import {forkScenario} from '../src/domain/scenarios';
import {simulateForDisplay} from '../src/domain/engine';
import {gapRunStart,previewGapBranch} from '../src/app/gap-plan';
const project=()=>createLifeProject('原人生',{...migrateProject(initialProject).scenarios[0].profile,cash:0,income:0,expenses:1000000,rent:1000000},'root');
it('缺口分支預覽無寫入，負現金與負債不補平，全部排程深複製',()=>{
 const p=project();p.scenarios[0].events=[{id:'rest',type:'unemployment',version:1,month:6,duration:2,replacementIncome:0}];const before=structuredClone(p),preview=previewGapBranch(p,'root',3,0,'另一種可能','new');
 expect(p).toEqual(before);expect(preview.base).toBe(p);expect(preview.project.scenarios).toHaveLength(2);expect(preview.project.scenarios[0]).toEqual(before.scenarios[0]);expect(preview.project.scenarios[1]).toMatchObject({parentId:'root',forkMonth:0,revision:1,history:[]});
 for(const row of preview.rows)expect(row.after).toEqual(row.before);expect(preview.rows.find(r=>r.month===3)?.after).toMatchObject({cash:-6000000,debt:0,gap:true});preview.project.scenarios[1].events[0].month=8;expect(p).toEqual(before);
});
it('V1 不自動升級，只有快照轉接，回溯依連續缺口起點',()=>{
 const p=structuredClone(initialProject);p.scenarios[0].profile.cash=0;p.scenarios[0].profile.income=0;const rows=simulateForDisplay(p.scenarios[0]);expect(gapRunStart(rows,3)).toBe(1);const preview=previewGapBranch(p,'original',3,0,'保留舊版','new');expect(preview.project).toMatchObject({schemaVersion:1,engineVersion:'1.0.0'});expect(preview.project.scenarios[1].engineVersion).toBe('1.0.0');
});
it('拒絕未發生的缺口、空名稱、不合法/未來分支點，來源保持不變',()=>{
 const p=project(),before=structuredClone(p);for(const [at,point,name] of [[0,0,'名'],[2,3,'名'],[2,NaN,'名'],[2,.5,'名'],[2,0,' ']] as const)expect(()=>previewGapBranch(p,'root',at,point,name,'new')).toThrow();expect(p).toEqual(before);
});
it('不能透過缺口流程解鎖來源歷史，20 方案上限不寫入',()=>{
 const p=project();const child=forkScenario(p.scenarios[0],'child','已分支',1);p.scenarios.push(child);expect(()=>previewGapBranch(p,'child',3,0,'過早','new')).toThrow('不能解鎖');
 const base=p.scenarios[0];p.scenarios=Array.from({length:20},(_,i)=>({...structuredClone(base),id:i===0?'root':'s'+i}));const before=structuredClone(p);expect(()=>previewGapBranch(p,'root',3,0,'超限','new')).toThrow('20');expect(p).toEqual(before);
});
