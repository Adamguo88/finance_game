import {reconcileDetails,validateDetails,type InitialDetails} from './initial-details';
import { ProjectSchema, type Project, type Scenario, type LifeEvent } from './model';
import { validateScenario, simulate } from './engine';
export function forkScenario<S extends Scenario>(parent:S,id:string,name:string,month:number):S {
 validateScenario(parent);
 if(!id||id===parent.id||!Number.isInteger(month)||month<0||month>=(90-parent.profile.age)*12)throw new Error('無效分支點');
 return validateScenario({...structuredClone(parent),id,name,parentId:parent.id,forkMonth:month,revision:1,history:[]}) as S;
}
export function changeEvents<S extends Scenario>(s:S,events:Array<S['events'][number]>):S {
 if(s.forkMonth!==null){
  const historical=(xs:LifeEvent[])=>JSON.stringify(xs.filter(e=>e.month<=s.forkMonth!).sort((a,b)=>a.id.localeCompare(b.id,'en')));
  if(historical(s.events)!==historical(events))throw new Error('分支點之前的事件不可修改，請建立更早的分支');
 }
 return validateScenario({...s,events:structuredClone(events),history:[...s.history,{revision:s.revision,profile:structuredClone(s.profile),events:structuredClone(s.events),...(s.initialDetails?{initialDetails:structuredClone(s.initialDetails)}:{})}],revision:s.revision+1}) as S;
}
export function changeProfile<S extends Scenario>(s:S,profile:S['profile'],details?:InitialDetails):S {
 if(s.parentId!==null)throw new Error('分支保留初始資料；請另建人生修改基礎條件');
 return validateScenario({...s,...(details?{initialDetails:validateDetails(details,profile)}:s.initialDetails?{initialDetails:reconcileDetails(s.initialDetails,profile)}:{}),profile:{...profile,version:s.profile.version+1},history:[...s.history,{revision:s.revision,profile:structuredClone(s.profile),events:structuredClone(s.events),...(s.initialDetails?{initialDetails:structuredClone(s.initialDetails)}:{})}],revision:s.revision+1}) as S;
}
export function parseProject(value:unknown):Project {
 // Reject oversized raw payloads before schema parsing strips/defaults any fields.
 if(new TextEncoder().encode(JSON.stringify(value)).length>2_000_000)throw new Error('專案超過 2 MB，請減少方案或歷史資料');
 const p=ProjectSchema.parse(value);
 const map=new Map<string,Scenario>(p.scenarios.map(s=>[s.id,s]));
 if(map.size!==p.scenarios.length)throw new Error('人生 ID 重複');
 for(const s of p.scenarios){
  validateScenario(s);
  if(s.parentId!==null){
   const parent=map.get(s.parentId);if(!parent||parent.id===s.id)throw new Error('找不到分支來源');
   if(parent.engineVersion!==s.engineVersion)throw new Error('分支來源與子方案必須使用相同引擎版本');
   const visited=new Set([s.id]);let node:Scenario|undefined=parent;
   while(node){if(visited.has(node.id))throw new Error('分支循環');visited.add(node.id);node=node.parentId!==null?map.get(node.parentId):undefined;}
  }
 }
 if(p.schemaVersion!==1&&p.migration){
  const ids=p.migration.sourceScenarioIds;
  if(new Set(ids).size!==ids.length||ids.some(id=>!map.has(id)))throw new Error('轉換來源紀錄無效');
 }
 if(new TextEncoder().encode(JSON.stringify(p)).length>2_000_000)throw new Error('專案超過 2 MB，請減少方案或歷史資料');
 return p;
}
export function replaceScenario<P extends Project>(p:P,next:Scenario):P {
 if(!p.scenarios.some(s=>s.id===next.id))throw new Error('找不到人生');
 const upgraded=(next.initialDetails&&p.schemaVersion!==3)?{schemaVersion:3,migration:p.schemaVersion===1?null:p.migration,scenarios:p.scenarios}:p;
 return parseProject({...upgraded,scenarios:p.scenarios.map(s=>s.id===next.id?structuredClone(next):s)}) as P;
}
export function compareAt(scenarios:Scenario[],month:number){return scenarios.map(s=>({id:s.id,snapshot:simulate(s,month)[month]}));}
