import type {Project,SnapshotV2} from '@/domain/model';
import {simulateForDisplay} from '@/domain/engine';
import {forkScenario,parseProject} from '@/domain/scenarios';
export function gapRunStart(rows:SnapshotV2[],month:number){let at=month;while(at>0&&rows[at-1]?.gap)at--;return at;}
export function previewGapBranch(project:Project,sourceId:string,at:number,forkMonth:number,name:string,id:string){
 const source=project.scenarios.find(s=>s.id===sourceId);if(!source)throw Error('找不到來源人生');
 const before=simulateForDisplay(source),horizon=before.length-1;
 if(!Number.isInteger(at)||!before[at]?.gap)throw Error('目前月份沒有現金缺口');
 if(project.scenarios.length>=20)throw Error('最多 20 個人生，請先使用現有方案規劃');
 if(!Number.isInteger(forkMonth)||forkMonth<(source.forkMonth??0)||forkMonth>Math.min(at,horizon-1))throw Error('分支點超出可規劃範圍，不能解鎖來源人生的歷史');
 if(!name.trim()||name.trim().length>80)throw Error('分支名稱請輸入 1–80 字');
 const branch=forkScenario(source,id,name.trim(),forkMonth),candidate=parseProject({...project,scenarios:[...project.scenarios,branch]}),after=simulateForDisplay(branch);
 return {base:project,project:candidate,sourceId,branchId:branch.id,forkMonth,observedMonth:at,rows:[...new Set([forkMonth,at,horizon])].map(month=>({month,before:before[month],after:after[month]}))};
}
export type GapBranchPreview=ReturnType<typeof previewGapBranch>;
