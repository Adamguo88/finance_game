import {z} from 'zod';
import {AvatarPresentationSchema,type AvatarPresentation} from './avatar-metadata';
import {EventV3Schema,ProfileV3Schema,type LifeEventV3,type ProfileV3,type ScenarioV3} from './model-v3';
import {parseProjectV5,type ProjectV5} from './project-v5';
export interface V3ScenarioBasis{scenarioId:string;revision:number}
function source(project:ProjectV5,basis:V3ScenarioBasis):ScenarioV3{
 const s=project.scenarios.find(s=>s.id===basis.scenarioId);
 if(!s)throw Error('找不到目前人生');
 if(s.engineVersion!=='3.0.0')throw Error('此操作需要分項模型，原有模型不會自動轉換');
 if(!Number.isSafeInteger(basis.revision)||basis.revision!==s.revision)throw Error('預覽已過期，請重新開啟目前人生');
 return s;
}
const eventSet=(events:LifeEventV3[])=>JSON.stringify([...events].sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0));
function previous(s:ScenarioV3){return {revision:s.revision,profile:structuredClone(s.profile),events:structuredClone(s.events),...(s.presentation?{presentation:structuredClone(s.presentation)}:{})};}
function history(s:ScenarioV3){if(s.history.length>=1000)throw Error('修改歷史已達1000筆，請保留完整備份並另建人生規劃');return [...s.history,previous(s)];}
function replace(p:ProjectV5,next:ScenarioV3):ProjectV5{return parseProjectV5({...p,scenarios:p.scenarios.map(s=>s.id===next.id?next:s)});}
/** Copies the complete plan; never unlocks a source branch's already frozen past. */
export function forkV3Scenario(input:unknown,basis:V3ScenarioBasis,id:string,name:string,month:number):ProjectV5{
 const p=parseProjectV5(input),s=source(p,basis),horizon=(90-s.profile.age)*12;
 if(typeof name!=='string'||!name.trim()||name.trim().length>80)throw Error('分支名稱請輸入1–80字');
 if(p.scenarios.length>=20)throw Error('最多20個人生');
 if(p.scenarios.some(s=>s.id===id))throw Error('人生 ID 重複');
 if(!Number.isInteger(month)||month<(s.forkMonth??0)||month>=horizon)throw Error('分支點無效；不能解鎖來源已保留的歷史');
 const next={...structuredClone(s),id,name:name.trim(),parentId:s.id,forkMonth:month,revision:1,history:[]};
 return parseProjectV5({...p,scenarios:[...p.scenarios,next]});
}
const stateUpdateSchema=z.object({profile:ProfileV3Schema.optional(),events:z.array(EventV3Schema).max(100).optional(),presentation:AvatarPresentationSchema.optional()}).strict();
export type V3StateUpdate=z.infer<typeof stateUpdateSchema>;
function updateState(input:unknown,basis:V3ScenarioBasis,update:V3StateUpdate,rootOnly=false):ProjectV5{
 const p=parseProjectV5(input),s=source(p,basis);
 if(rootOnly&&s.parentId!==null)throw Error('分支保留初始資料，請另建人生修改基礎條件');
 const patch=stateUpdateSchema.parse(update),profile=patch.profile??s.profile,events=patch.events??s.events,appearance=patch.presentation??s.presentation;
 if(profile.id!==s.profile.id||profile.version!==s.profile.version)throw Error('基礎資料識別或版本已改變，請重新開啟表單');
 const profileChanged=JSON.stringify(profile)!==JSON.stringify(s.profile)||JSON.stringify(appearance)!==JSON.stringify(s.presentation);
 if(profileChanged&&s.parentId!==null)throw Error('分支保留初始資料，請另建人生修改基礎條件');
 if(s.forkMonth!==null){
  const past=(events:LifeEventV3[])=>eventSet(events.filter(e=>e.month<=s.forkMonth!));
  if(past(s.events)!==past(events))throw Error('分支點以前的事件不可修改，請選擇更早的來源人生');
 }
 const eventsChanged=eventSet(s.events)!==eventSet(events);
 if(!profileChanged&&!eventsChanged)return p;
 return replace(p,{...s,profile:profileChanged?{...profile,version:s.profile.version+1}:s.profile,events:eventsChanged?events:s.events,...(appearance?{presentation:appearance}:{}),revision:s.revision+1,history:history(s)});
}
/** Updates definitions and affected event references in one validated revision, with no intermediate state. */
export function changeV3State(input:unknown,basis:V3ScenarioBasis,update:V3StateUpdate):ProjectV5{return updateState(input,basis,update);}
/** Atomic event edit: <=forkMonth fields and membership are immutable. */
export function changeV3Events(input:unknown,basis:V3ScenarioBasis,events:LifeEventV3[]):ProjectV5{if(!Array.isArray(events))throw Error('事件參數必須為完整清單');return updateState(input,basis,{events});}
/** Root-only profile edit; history and source archives remain available for original-version replay. */
export function changeV3Profile(input:unknown,basis:V3ScenarioBasis,profile:ProfileV3,presentation?:AvatarPresentation):ProjectV5{if(profile===null||typeof profile!=='object'||Array.isArray(profile))throw Error('基礎資料需要完整參數');return updateState(input,basis,{profile,presentation},true);}
