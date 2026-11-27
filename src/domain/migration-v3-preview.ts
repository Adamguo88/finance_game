import {z} from 'zod';
import {parseProject} from './scenarios';
import {simulateForDisplay} from './engine';
import type {Project,Scenario,SnapshotV2} from './model';
import {ScenarioV3Schema,validateScenarioV3,type ScenarioV3} from './model-v3';
import {simulateV3,type SnapshotV3} from './engine-v3';

/** Comparison infrastructure only: no inferred mappings, confirmation, schema5 or DB writes. */
export const migrationFieldsV3=['cash','assets','debt','netWorth','income','expenses','payment','interest','cashFlow'] as const;
type Field=typeof migrationFieldsV3[number];
type Values=Record<Field,number>;
export interface MigrationContextV3{scenarioId:string;context:'current'|'history';revision:number}
export interface MigrationDifferenceV3{field:Field;before:number;after:number;delta:string}
export interface MigrationMonthV3{month:number;before:Values;after:Values;differences:MigrationDifferenceV3[]}
export interface MigrationSummaryV3 extends MigrationContextV3{
 beforeEngineVersion:Scenario['engineVersion'];afterEngineVersion:'3.0.0';monthsCompared:number;changedMonths:number;
 firstDifference:{month:number;differences:MigrationDifferenceV3[]}|null;
 maxAbsoluteDelta:Record<Field,string>;lastDelta:Record<Field,string>;totalDelta:Record<Field,string>;
}
export interface MigrationComparisonV3{source:Project;sourceScenarioIds:string[];proposedScenarios:ScenarioV3[];summaries:MigrationSummaryV3[];hasDifferences:boolean}
/** Convert the serialized legacy decimal exactly; never round a missing precision into a new rate. */
export function legacyAnnualRateToPpm(rate:number):number{
 if(typeof rate!=='number'||!Number.isFinite(rate)||rate<0||rate>0.3)throw Error('原利率無效');
 const match=String(rate).match(/^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i);
 if(!match)throw Error('原利率格式無效');
 const fraction=match[2]??'',power=fraction.length-Number(match[3]??0);
 let numerator=BigInt(match[1]+fraction)*1000000n;
 const denominator=power>0?10n**BigInt(power):1n;
 if(power<0)numerator*=10n**BigInt(-power);
 if(numerator%denominator!==0n)throw Error('原利率無法無損表示為ppm，請保留舊版或另建明示假設');
 return Number(numerator/denominator);
}
function same(a:unknown,b:unknown){return JSON.stringify(a)===JSON.stringify(b);}
function validatePair(old:Scenario,next:ScenarioV3){
 for(const key of ['id','name','parentId','forkMonth','revision'] as const)if(old[key]!==next[key])throw Error('遷移不得改寫方案識別、分支或 revision');
 for(const key of ['id','version','age'] as const)if(old.profile[key]!==next.profile[key])throw Error('遷移不得改寫初始識別、版本或期間');
 if(!same(old.presentation,next.presentation))throw Error('遷移不得遺失或改寫角色資料');
 if(old.history.length!==next.history.length)throw Error('遷移歷史數量不完整');
 for(let i=0;i<old.history.length;i++){
  const a=old.history[i],b=next.history[i];
  if(a.revision!==b.revision||a.profile.id!==b.profile.id||a.profile.version!==b.profile.version||a.profile.age!==b.profile.age||!same(a.presentation,b.presentation))throw Error('遷移歷史識別、期間或角色資料不完整');
 }
}
function prepare(input:unknown,proposals:unknown){
 const source=parseProject(input);
 // Bound untrusted proposals before parsing, just as the existing project import does.
 if(new TextEncoder().encode(JSON.stringify(proposals)).length>2_000_000)throw Error('遷移候選超過2 MB');
 const parsed=z.array(ScenarioV3Schema).min(1).max(20).parse(proposals),candidates=parsed.map(validateScenarioV3);
 const ids=new Set(candidates.map(s=>s.id));if(ids.size!==candidates.length)throw Error('遷移候選 ID 重複');
 const sourceMap=new Map(source.scenarios.map(s=>[s.id,s]));
 for(const next of candidates){const old=sourceMap.get(next.id);if(!old)throw Error('找不到原始方案');validatePair(old,next);}
 for(const old of source.scenarios)if(old.parentId!==null&&ids.has(old.id)!==ids.has(old.parentId))throw Error('必須選取完整分支樹');
 return {source,candidates,sourceMap};
}
function beforeValues(row:SnapshotV2):Values{return {cash:row.cash,assets:row.assets,debt:row.debt,netWorth:row.netWorth,income:row.income,expenses:row.expenses,payment:row.mortgagePayment+row.scheduledDebtPayment,interest:row.mortgageInterest+row.scheduledDebtInterest,cashFlow:row.cashFlow};}
function afterValues(row:SnapshotV3):Values{return Object.fromEntries(migrationFieldsV3.map(key=>[key,row[key]])) as Values;}
function compare(old:Scenario,next:ScenarioV3):MigrationMonthV3[]{
 const before=simulateForDisplay(old),after=simulateV3(next);
 if(before.length!==after.length)throw Error('遷移比較期間不一致');
 return before.map((row,month)=>{
  const a=beforeValues(row),b=afterValues(after[month]);
  const differences=migrationFieldsV3.filter(key=>a[key]!==b[key]).map(field=>({field,before:a[field],after:b[field],delta:(BigInt(b[field])-BigInt(a[field])).toString()}));
  return {month,before:a,after:b,differences};
 });
}
function contexts(old:Scenario,next:ScenarioV3){
 const result=[{context:'current' as const,revision:old.revision,old,next}];
 const {initialDetails:_details,presentation:_oldPresentation,...oldBase}=old;
 const {presentation:_nextPresentation,...nextBase}=next;
 return [...result,...old.history.map((entry,i)=>({context:'history' as const,revision:entry.revision,old:{...oldBase,...entry,history:[]} as Scenario,next:{...nextBase,...next.history[i],history:[]} as ScenarioV3}))];
}
/** Every current/history month is examined; retain only summaries, not all trees' monthly tables. */
export function previewV3TreeComparison(input:unknown,proposals:unknown):MigrationComparisonV3{
 const {source,candidates,sourceMap}=prepare(input,proposals),summaries:MigrationSummaryV3[]=[];
 for(const next of candidates){
  const old=sourceMap.get(next.id)!;
  for(const state of contexts(old,next)){
   const rows=compare(state.old,state.next),changed=rows.filter(r=>r.differences.length>0);
   const maximum=Object.fromEntries(migrationFieldsV3.map(key=>[key,0n])) as Record<Field,bigint>,total=Object.fromEntries(migrationFieldsV3.map(key=>[key,0n])) as Record<Field,bigint>;
   for(const row of changed)for(const d of row.differences){const n=BigInt(d.delta),absolute=n<0n?-n:n;total[d.field]+=n;if(absolute>maximum[d.field])maximum[d.field]=absolute;}
   const last=rows[rows.length-1];
   summaries.push({scenarioId:old.id,context:state.context,revision:state.revision,beforeEngineVersion:old.engineVersion,afterEngineVersion:'3.0.0',monthsCompared:rows.length,changedMonths:changed.length,firstDifference:changed[0]?{month:changed[0].month,differences:changed[0].differences}:null,maxAbsoluteDelta:Object.fromEntries(migrationFieldsV3.map(key=>[key,maximum[key].toString()])) as Record<Field,string>,lastDelta:Object.fromEntries(migrationFieldsV3.map(key=>[key,(BigInt(last.after[key])-BigInt(last.before[key])).toString()])) as Record<Field,string>,totalDelta:Object.fromEntries(migrationFieldsV3.map(key=>[key,total[key].toString()])) as Record<Field,string>});
  }
 }
 return {source,sourceScenarioIds:candidates.map(s=>s.id),proposedScenarios:candidates,summaries,hasDifferences:summaries.some(s=>s.changedMonths>0)};
}
/** On-demand full table for one revision; consumers can page it without retaining all histories. */
export function compareV3MigrationMonths(input:unknown,proposals:unknown,context:MigrationContextV3):MigrationMonthV3[]{
 const {candidates,sourceMap}=prepare(input,proposals),next=candidates.find(s=>s.id===context.scenarioId),old=sourceMap.get(context.scenarioId);
 if(!next||!old)throw Error('找不到比較方案');
 const state=contexts(old,next).find(x=>x.context===context.context&&x.revision===context.revision);
 if(!state)throw Error('找不到比較歷史版本');
 return compare(state.old,state.next);
}
