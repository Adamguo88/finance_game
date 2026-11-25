import { type ProfileV1, type ProfileV2, type LifeEventV1, type LifeEventV2, type ScenarioV2, type ProjectV2, V2_ENGINE_VERSION } from './model';
import { parseProject } from './scenarios';
import { simulate } from './engine';

function migrateProfile(profile:ProfileV1):ProfileV2 {
 return {...structuredClone(profile),rent:0,debtSchedules:[]};
}
function migrateEvents(events:LifeEventV1[]):LifeEventV2[] {
 return events.map(event=>event.type==='buyHouse'?{...event,version:2,stopRent:false}:{...event});
}
export type MigratedProject=Omit<ProjectV2,'scenarios'>&{scenarios:ScenarioV2[]};
/** Explicit, deterministic conversion. Callers must preview before committing to their workspace. */
export function migrateProject(input:unknown):MigratedProject {
 const source=parseProject(input);
 if(source.schemaVersion!==1)throw new Error('僅支援將 schemaVersion=1 專案轉換為新版');
 const scenarios:ScenarioV2[]=source.scenarios.map(s=>({
  ...s,engineVersion:V2_ENGINE_VERSION,profile:migrateProfile(s.profile),events:migrateEvents(s.events),
  history:s.history.map(entry=>({revision:entry.revision,profile:migrateProfile(entry.profile),events:migrateEvents(entry.events)}))
 }));
 const result=parseProject({schemaVersion:2,scenarios,migration:{fromSchema:1,fromEngine:'1.0.0',sourceScenarioIds:source.scenarios.map(s=>s.id)}}) as MigratedProject;
 // A conversion is permitted only when every legacy output is preserved, not just the preview month.
 for(let i=0;i<source.scenarios.length;i++){
  const before=simulate(source.scenarios[i]),after=simulate(result.scenarios[i]);
  if(before.some((row,month)=>Object.entries(row).some(([key,value])=>after[month][key as keyof typeof row]!==value)))throw new Error('轉換前後財務結果不一致，已取消轉換');
 }
 return result;
}
