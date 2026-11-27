import {z} from 'zod';
import {parseProject} from './scenarios';
import {validateV3SourceMappings} from './migration-v3-mappings';
import {parseProjectV5} from './project-v5';
import {ScenarioV3Schema} from './model-v3';
import type {Scenario} from './model';

function parseSource(input:unknown){return input!==null&&typeof input==='object'&&'schemaVersion' in input&&input.schemaVersion===5?parseProjectV5(input):parseProject(input);}

/** In-memory confirmation protocol. It never mutates the workspace or writes storage. */
export function createV3MigrationSession(input:unknown,proposals:unknown,mappings:unknown){
 const source=parseSource(input),signature=JSON.stringify(source),backupJSON=JSON.stringify(input);
 let legacySource:ReturnType<typeof parseProject>;
 if(source.schemaVersion===5){
  if(new TextEncoder().encode(JSON.stringify(proposals)).length>2_000_000)throw Error('遷移候選超過2 MB');
  const targets=z.array(ScenarioV3Schema).min(1).max(20).parse(proposals);
  if(targets.some(target=>source.scenarios.some(s=>s.id===target.id&&s.engineVersion==='3.0.0')))throw Error('已升級的人生不可重複遷移');
  const scenarios=source.scenarios.filter((s):s is Scenario=>s.engineVersion!=='3.0.0');
  if(!scenarios.length)throw Error('沒有尚未升級的舊人生');
  // Include all legacy roots and children so the existing whole-tree check cannot be bypassed.
  legacySource=parseProject({schemaVersion:4,scenarios,migration:null});
 }else legacySource=source;
 const validated=validateV3SourceMappings(legacySource,proposals,mappings),selected=new Map(validated.comparison.proposedScenarios.map(s=>[s.id,s]));
 const {scenarios:_scenarios,...legacyEnvelope}=source;
 const sourceEnvelope=source.schemaVersion===5?{schemaVersion:5,migration:{legacy:source.migration.legacy,itemizedRecordIndexes:source.migration.itemized.map((_,i)=>i)}}:legacyEnvelope;
 const previous=source.schemaVersion===5?source.migration.itemized:[];
 const legacy=source.schemaVersion===5?source.migration.legacy:source.schemaVersion===1?null:source.migration;
 const candidate=parseProjectV5({schemaVersion:5,scenarios:source.scenarios.map(s=>selected.get(s.id)??s),migration:{legacy,itemized:[...previous,{version:1,sourceSchema:source.schemaVersion,sourceScenarioIds:[...selected.keys()],sourceScenarios:source.scenarios.filter(s=>selected.has(s.id)),sourceEnvelope,mappings:validated.mappings}]}});
 let closed=false,backupRequested=false;
 function open(){if(closed)throw Error('遷移已取消或完成，請重新建立預覽');}
 return {
  getPreview(){open();return structuredClone({candidate,comparison:{...validated.comparison,source}});},
  /** UI must initiate a backup download and handle download errors before enabling confirmation. */
  exportOriginalBackup(){open();backupRequested=true;return backupJSON;},
  cancel(){closed=true;},
  confirm(current:unknown,options:{acceptDifferences:boolean;preserveResults:boolean}){
   open();const checked=z.object({acceptDifferences:z.boolean(),preserveResults:z.boolean()}).strict().parse(options);
   if(!backupRequested)throw Error('請先匯出原始備份');
   if(JSON.stringify(parseSource(current))!==signature)throw Error('工作資料已改變，請重新建立遷移預覽');
   if(validated.comparison.hasDifferences&&(checked.preserveResults||!checked.acceptDifferences))throw Error('新舊結果有差異，須明確確認；保留結果模式不可接受差異');
   const result=parseProjectV5(candidate);closed=true;return result;
  }
 };
}
