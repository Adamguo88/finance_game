import {z} from 'zod';
import {ScenarioV1Schema,ScenarioV2Schema,ScenarioSchema,ProjectV1Schema,ProjectV2Schema,ProjectV3Schema,ProjectV4Schema,MetadataMigrationRecordSchema,type Scenario} from './model';
import {ScenarioV3Schema,validateScenarioV3,type ScenarioV3} from './model-v3';
import {validateScenario} from './engine';
import {parseProject} from './scenarios';
import {V3MappingPlanSchema,validateV3SourceMappings} from './migration-v3-mappings';

/** Staged codec: deliberately separate from the current application's schema1–4 parser. */
const sourceEnvelope=z.discriminatedUnion('schemaVersion',[
 ProjectV1Schema.omit({scenarios:true}),ProjectV2Schema.omit({scenarios:true}),ProjectV3Schema.omit({scenarios:true}),ProjectV4Schema.omit({scenarios:true})
]);
export const ItemizedMigrationRecordSchema=z.object({version:z.literal(1),sourceSchema:z.union([z.literal(1),z.literal(2),z.literal(3),z.literal(4)]),sourceScenarioIds:z.array(z.string().min(1)).min(1).max(20),sourceScenarios:z.array(ScenarioSchema).min(1).max(20),sourceEnvelope,mappings:z.array(V3MappingPlanSchema).max(20020)}).strict();
export const ProjectV5Schema=z.object({schemaVersion:z.literal(5),scenarios:z.array(z.discriminatedUnion('engineVersion',[ScenarioV1Schema,ScenarioV2Schema,ScenarioV3Schema])).min(1).max(20),migration:z.object({legacy:MetadataMigrationRecordSchema.nullable(),itemized:z.array(ItemizedMigrationRecordSchema).max(20)}).strict()}).strict();
export type ProjectV5=z.infer<typeof ProjectV5Schema>;
export type ItemizedMigrationRecord=z.infer<typeof ItemizedMigrationRecordSchema>;
const bytes=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value)).length;
function sameIds(a:string[],b:string[]){return a.length===b.length&&new Set(a).size===a.length&&a.every(id=>b.includes(id));}
function sourceProject(record:ItemizedMigrationRecord){
 if(record.sourceSchema!==record.sourceEnvelope.schemaVersion)throw Error('遷移來源容器版本不一致');
 // Original global migration metadata is archived, but may name unselected independent trees.
 // Revalidate the selected original financial trees with that global reference removed.
 const envelope=record.sourceEnvelope.schemaVersion===1?record.sourceEnvelope:{...record.sourceEnvelope,migration:null};
 return parseProject({...envelope,scenarios:record.sourceScenarios});
}
function originalBaseline(old:Scenario,target:ScenarioV3):ScenarioV3{
 if(old.parentId!==target.parentId||old.forkMonth!==target.forkMonth)throw Error('遷移來源分支關係被改寫');
 const state=(revision:number)=>{
  if(target.revision===revision)return {revision,profile:target.profile,events:target.events,...(target.presentation?{presentation:target.presentation}:{})};
  const entry=target.history.find(x=>x.revision===revision);if(!entry)throw Error('找不到遷移時的原始V3 revision');return entry;
 };
 const current=state(old.revision);
 return {id:old.id,name:old.name,parentId:old.parentId,forkMonth:old.forkMonth,engineVersion:'3.0.0',...current,history:old.history.map(entry=>state(entry.revision))};
}
/** Strictly validates live scenarios, archived original trees and the baseline behind each mapping. */
export function parseProjectV5(input:unknown):ProjectV5{
 if(bytes(input)>2_000_000)throw Error('schema5專案超過2 MB（包含來源備份與映射）');
 const p=ProjectV5Schema.parse(input),map=new Map(p.scenarios.map(s=>[s.id,s]));
 if(map.size!==p.scenarios.length)throw Error('人生 ID 重複');
 for(const s of p.scenarios){
  if(s.engineVersion==='3.0.0')validateScenarioV3(s);else validateScenario(s);
  if(s.parentId!==null){
   const parent=map.get(s.parentId);if(!parent||parent.engineVersion!==s.engineVersion)throw Error('分支來源不存在或引擎版本不一致');
   const visited=new Set([s.id]);let node:typeof parent|undefined=parent;
   while(node){if(visited.has(node.id))throw Error('分支循環');visited.add(node.id);node=node.parentId===null?undefined:map.get(node.parentId);}
  }
 }
 if(p.migration.legacy){const ids=p.migration.legacy.sourceScenarioIds;if(new Set(ids).size!==ids.length||ids.some(id=>!map.has(id)))throw Error('舊遷移來源紀錄無效');}
 const converted=new Set<string>();
 for(const record of p.migration.itemized){
  if(!sameIds(record.sourceScenarioIds,record.sourceScenarios.map(s=>s.id)))throw Error('遷移來源方案清單不一致');
  const legacy=record.sourceEnvelope.schemaVersion===1?null:record.sourceEnvelope.migration;
  if(JSON.stringify(legacy)!==JSON.stringify(p.migration.legacy))throw Error('原始全域遷移資料未保留');
  const source=sourceProject(record),baselines:ScenarioV3[]=[];
  for(const old of source.scenarios){
   if(converted.has(old.id))throw Error('同一方案不可重複遷移');converted.add(old.id);
   const target=map.get(old.id);if(!target||target.engineVersion!=='3.0.0')throw Error('遷移目標不存在或版本錯誤');
   baselines.push(originalBaseline(old,target));
  }
  validateV3SourceMappings(source,baselines,record.mappings);
 }
 if(bytes(p)>2_000_000)throw Error('schema5專案超過2 MB');
 return p;
}
export function exportProjectV5(input:unknown):string{return JSON.stringify(parseProjectV5(input));}
export function importProjectV5(json:string):ProjectV5{if(new TextEncoder().encode(json).length>2_000_000)throw Error('schema5專案超過2 MB');return parseProjectV5(JSON.parse(json));}
