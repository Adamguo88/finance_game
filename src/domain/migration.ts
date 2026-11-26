import { type ProfileV1, type ProfileV2, type LifeEventV1, type LifeEventV2, type ScenarioV2, type ProjectV2,type ProjectV4,type Project, V2_ENGINE_VERSION } from './model';
import { parseProject } from './scenarios';
import { simulate } from './engine';

function migrateProfile(profile:ProfileV1):ProfileV2 {
 return {...structuredClone(profile),rent:0,debtSchedules:[]};
}
function migrateEvents(events:LifeEventV1[]):LifeEventV2[] {
 return events.map(event=>event.type==='buyHouse'?{...event,version:2,stopRent:false}:{...event});
}
export type MigratedProject=(Omit<ProjectV2,'scenarios'>&{scenarios:ScenarioV2[]})|(Omit<ProjectV4,'scenarios'>&{scenarios:ScenarioV2[]});
export function canMigrateProject(p:Project){return p.schemaVersion===1||((p.schemaVersion===3||p.schemaVersion===4)&&p.scenarios.every(s=>s.engineVersion==='1.0.0'));}
/** Explicit, deterministic conversion. Callers must preview before committing to their workspace. */
export function migrateProject(input:unknown):MigratedProject {
 const source=parseProject(input);
 if(!canMigrateProject(source))throw new Error('僅支援完整 V1 專案的顯式轉換；混合或已升級引擎不再次轉換');
 const scenarios:ScenarioV2[]=source.scenarios.map(s=>{if(s.engineVersion!=='1.0.0')throw new Error('只能轉換完整 V1 專案');return ({
  ...s,engineVersion:V2_ENGINE_VERSION,profile:migrateProfile(s.profile),events:migrateEvents(s.events),
  history:s.history.map(entry=>({...entry,revision:entry.revision,profile:migrateProfile(entry.profile),events:migrateEvents(entry.events)}))
 });});
 const result=parseProject({schemaVersion:source.schemaVersion===1?2:4,scenarios,migration:{fromSchema:source.schemaVersion,fromEngine:'1.0.0',sourceScenarioIds:source.scenarios.map(s=>s.id)}}) as MigratedProject;
 // A conversion is permitted only when every legacy output is preserved, not just the preview month.
 for(let i=0;i<source.scenarios.length;i++){
  const before=simulate(source.scenarios[i]),after=simulate(result.scenarios[i]);
  if(before.some((row,month)=>Object.entries(row).some(([key,value])=>after[month][key as keyof typeof row]!==value)))throw new Error('轉換前後財務結果不一致，已取消轉換');
 }
 return result;
}
