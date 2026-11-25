import { ProjectSchema, type Project, type Scenario, type LifeEvent } from './model';
import { validateScenario, simulate } from './engine';
export function forkScenario(parent:Scenario,id:string,name:string,month:number):Scenario{
 validateScenario(parent);
 if(!id||id===parent.id||!Number.isInteger(month)||month<0||month>=(90-parent.profile.age)*12)throw new Error('無效分支點');
 return validateScenario({...structuredClone(parent),id,name,parentId:parent.id,forkMonth:month,revision:1,history:[]});
}
export function changeEvents(s:Scenario,events:LifeEvent[]):Scenario {
 if(s.forkMonth!==null){
  const historical=(xs:LifeEvent[])=>JSON.stringify(xs.filter(e=>e.month<=s.forkMonth!).sort((a,b)=>a.id.localeCompare(b.id)));
  if(historical(s.events)!==historical(events))throw new Error('分支點之前的事件不可修改，請建立更早的分支');
 }
 return validateScenario({...s,events:structuredClone(events),history:[...s.history,{revision:s.revision,profile:structuredClone(s.profile),events:structuredClone(s.events)}],revision:s.revision+1});
}
export function changeProfile(s:Scenario,profile:Scenario['profile']):Scenario{
 if(s.parentId!==null)throw new Error('分支保留初始資料；請另建人生修改基礎條件');
 return validateScenario({...s,profile:{...profile,version:s.profile.version+1},history:[...s.history,{revision:s.revision,profile:structuredClone(s.profile),events:structuredClone(s.events)}],revision:s.revision+1});
}
export function parseProject(value:unknown):Project{
 const p=ProjectSchema.parse(value);
 const map=new Map(p.scenarios.map(s=>[s.id,s]));
 if(map.size!==p.scenarios.length)throw new Error('人生 ID 重複');
 for(const s of p.scenarios){
  validateScenario(s);
  if(s.parentId!==null){
   const parent=map.get(s.parentId); if(!parent||parent.id===s.id)throw new Error('找不到分支來源');
   const visited=new Set([s.id]);let node:Scenario|undefined=parent;
   while(node){if(visited.has(node.id))throw new Error('分支循環');visited.add(node.id);node=node.parentId?map.get(node.parentId):undefined;}
  }
 }
 if(new TextEncoder().encode(JSON.stringify(p)).length>2_000_000)throw new Error('專案超過 2 MB，請減少方案或歷史資料');
 return p;
}
export function replaceScenario(p:Project,next:Scenario):Project{
 const old=p.scenarios.find(s=>s.id===next.id);if(!old)throw new Error('找不到人生');
 // Children retain their own frozen profile and copied history. Parent edits never propagate.
 return parseProject({...p,scenarios:p.scenarios.map(s=>s.id===next.id?structuredClone(next):s)});
}
export function compareAt(scenarios:Scenario[],month:number){return scenarios.map(s=>({id:s.id,snapshot:simulate(s,month)[month]}));}
