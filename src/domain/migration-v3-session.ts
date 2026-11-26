import {z} from 'zod';
import {parseProject} from './scenarios';
import {validateV3SourceMappings} from './migration-v3-mappings';
import {parseProjectV5} from './project-v5';

/** In-memory confirmation protocol. It never mutates the workspace or writes storage. */
export function createV3MigrationSession(input:unknown,proposals:unknown,mappings:unknown){
 const source=parseProject(input),signature=JSON.stringify(source),backupJSON=JSON.stringify(input);
 const validated=validateV3SourceMappings(source,proposals,mappings),selected=new Map(validated.comparison.proposedScenarios.map(s=>[s.id,s]));
 const {scenarios:_scenarios,...sourceEnvelope}=source;
 const candidate=parseProjectV5({schemaVersion:5,scenarios:source.scenarios.map(s=>selected.get(s.id)??s),migration:{legacy:source.schemaVersion===1?null:source.migration,itemized:[{version:1,sourceSchema:source.schemaVersion,sourceScenarioIds:[...selected.keys()],sourceScenarios:source.scenarios.filter(s=>selected.has(s.id)),sourceEnvelope,mappings:validated.mappings}]}});
 let closed=false,backupRequested=false;
 function open(){if(closed)throw Error('遷移已取消或完成，請重新建立預覽');}
 return {
  getPreview(){open();return structuredClone({candidate,comparison:validated.comparison});},
  /** UI must initiate a backup download and handle download errors before enabling confirmation. */
  exportOriginalBackup(){open();backupRequested=true;return backupJSON;},
  cancel(){closed=true;},
  confirm(current:unknown,options:{acceptDifferences:boolean;preserveResults:boolean}){
   open();const checked=z.object({acceptDifferences:z.boolean(),preserveResults:z.boolean()}).strict().parse(options);
   if(!backupRequested)throw Error('請先匯出原始備份');
   if(JSON.stringify(parseProject(current))!==signature)throw Error('工作資料已改變，請重新建立遷移預覽');
   if(validated.comparison.hasDifferences&&(checked.preserveResults||!checked.acceptDifferences))throw Error('新舊結果有差異，須明確確認；保留結果模式不可接受差異');
   const result=parseProjectV5(candidate);closed=true;return result;
  }
 };
}
