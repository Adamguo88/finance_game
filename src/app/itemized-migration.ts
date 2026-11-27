import type {Project,Scenario} from '../domain/model';
import type {LifeEventV3,ProfileV3,ScenarioV3} from '../domain/model-v3';
import {legacyRowsForV3,type LegacyRowV3,type V3MappingPlan} from '../domain/migration-v3-mappings';
import {legacyAnnualRateToPpm} from '../domain/migration-v3-preview';
import {parseStoredProject} from '../domain/workspace';

export const migrationRowKey=(row:Pick<LegacyRowV3,'category'|'sourceId'>)=>JSON.stringify([row.category,row.sourceId]);
export interface MigrationFrame {key:string;rootId:string;scenarioId:string;context:'current'|'history';revision:number;source:Scenario;rows:LegacyRowV3[]}
export interface MigrationChoices {
 scheduleSources:Record<string,string>;
 /** Event amounts are explicit decimal TWD strings, keyed by original event and original income row. */
 eventAmounts:Record<string,Record<string,string>>;
 incomeKinds:Record<string,ProfileV3['incomes'][number]['kind']>;
}
export const emptyMigrationChoices=():MigrationChoices=>({scheduleSources:{},eventAmounts:{},incomeKinds:{}});
export function parseMigrationMoney(value:string):number {
 if(value.length>14||!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value))throw Error('請輸入非負金額，最多兩位小數');
 const [whole,fraction='']=value.split('.'),cents=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
 if(cents>1000000000000n)throw Error('金額超過上限');
 return Number(cents);
}
/** Immutable full-workspace snapshot. Tree selection never extracts a child on its own. */
export function prepareItemizedMigration(input:unknown){
 const source=parseStoredProject(input),backupJSON=JSON.stringify(source);
 const legacy=source.scenarios.filter((s):s is Scenario=>s.engineVersion!=='3.0.0');
 const sourceMap=new Map(legacy.map(s=>[s.id,s]));
 const rootOf=(s:Scenario)=>{let root=s;while(root.parentId!==null)root=sourceMap.get(root.parentId)!;return root.id;};
 const roots=legacy.filter(s=>s.parentId===null).map(root=>({id:root.id,name:root.name,scenarioIds:legacy.filter(s=>rootOf(s)===root.id).map(s=>s.id)}));
 function select(rootIds:readonly string[]){
  if(!rootIds.length||new Set(rootIds).size!==rootIds.length||rootIds.some(id=>!roots.some(r=>r.id===id)))throw Error('請選擇完整的舊版人生樹');
  const selected=legacy.filter(s=>rootIds.includes(rootOf(s))),frames:MigrationFrame[]=[];
  for(const current of selected){
   const states=[{context:'current' as const,revision:current.revision,source:current},...current.history.map(entry=>{
    // Optional historic metadata must not inherit today's detail composition or avatar.
    const {initialDetails:_details,presentation:_presentation,...base}=current;
    return {context:'history' as const,revision:entry.revision,source:{...base,...entry,history:[]} as Scenario};
   })];
   for(const state of states)frames.push({...state,key:JSON.stringify([current.id,state.context,state.revision]),rootId:rootOf(current),scenarioId:current.id,rows:legacyRowsForV3(state.source)});
  }
  // Include all legacy trees in comparisons so existing whole-tree validation remains authoritative.
  const comparisonSource:Project={schemaVersion:4,scenarios:structuredClone(legacy),migration:null};
  return {frames:structuredClone(frames),comparisonSource,scenarioIds:selected.map(s=>s.id)};
 }
 return {source:structuredClone(source),backupJSON,roots:structuredClone(roots),select};
}
/** Stable IDs are scoped to the original tree and semantic source, never guessed from amounts/names. */
export function createMigrationIds(factory:()=>string){
 const identities=new Map<string,string>(),used=new Set<string>();
 return (rootId:string,...parts:unknown[])=>{
  const key=JSON.stringify([rootId,...parts]),existing=identities.get(key);if(existing)return existing;
  const id=factory();if(!id||id.length>160||/[\u0000-\u001f\u007f]/.test(id)||used.has(id))throw Error('新項目識別碼無效或重複');
  identities.set(key,id);used.add(id);return id;
 };
}
/** Copy decisions only when the complete financial source is identical, excluding counters. */
export function matchingMigrationFrames(a:MigrationFrame,b:MigrationFrame){
 const financial=(f:MigrationFrame)=>{const {version:_version,...profile}=f.source.profile;return JSON.stringify({profile,details:f.source.initialDetails??null,events:f.source.events});};
 return a.rootId===b.rootId&&financial(a)===financial(b);
}
type Ids=ReturnType<typeof createMigrationIds>;
/** Form adapter only. The domain session must validate every candidate and every month before applying. */
export function buildMigrationFrame(frame:MigrationFrame,choices:MigrationChoices,ids:Ids,confirmLegacyZeroCosts:boolean){
 const old=frame.source,p=old.profile,period={startMonth:0,endMonth:null},root=frame.rootId;
 const profile:ProfileV3={id:p.id,version:p.version,age:p.age,cash:p.cash,incomes:[],expenses:[],assets:[],liabilities:[]};
 const plan:V3MappingPlan={scenarioId:old.id,revision:frame.revision,context:frame.context,rows:[],schedules:[],events:[],confirmLegacyZeroCosts};
 const schedules='debtSchedules' in p?p.debtSchedules:[];
 for(const schedule of schedules)if(!choices.scheduleSources[schedule.id]||!frame.rows.some(row=>row.category==='debt'&&migrationRowKey(row)===choices.scheduleSources[schedule.id]))throw Error('請為每筆還款排程選擇原負債明細');
 for(const row of frame.rows){
  const key=migrationRowKey(row),targetIds:string[]=[],name=row.name,id=ids(root,'row',key);
  if(row.category==='income'){
   profile.incomes.push({...period,id,name,kind:choices.incomeKinds[key]??'other',amount:row.amount});targetIds.push(id);
  }else if(row.category==='expenses'||row.category==='rent'){
   profile.expenses.push({...period,id,name,kind:row.category==='rent'?'rent':'living',amount:row.amount});targetIds.push(id);
  }else if(row.category==='assets'){
   profile.assets.push({...period,id,name,kind:'other',openingValue:row.amount});targetIds.push(id);
  }else{
   let remaining=BigInt(row.amount);
   for(const schedule of schedules.filter(s=>choices.scheduleSources[s.id]===key)){
    remaining-=BigInt(schedule.openingBalance);
    const liabilityId=ids(root,'schedule',schedule.id);
    profile.liabilities.push({...period,id:liabilityId,name:`還款排程 ${schedules.indexOf(schedule)+1}`,kind:'amortizing',openingBalance:schedule.openingBalance,securedAssetId:null,schedule:{annualRatePpm:legacyAnnualRateToPpm(schedule.annualRate),rateMode:'fixed',firstPaymentMonth:schedule.firstPaymentMonth,termMonths:schedule.termMonths}});
    targetIds.push(liabilityId);plan.schedules.push({sourceId:schedule.id,targetLiabilityId:liabilityId});
   }
   if(remaining<0n)throw Error(`「${name}」分配的排程本金超過原負債金額`);
   if(remaining>0n){profile.liabilities.push({...period,id,name,kind:'static',openingBalance:Number(remaining),securedAssetId:null,schedule:null});targetIds.push(id);}
  }
  plan.rows.push({category:row.category,sourceId:row.sourceId,targetIds});
 }
 const events:LifeEventV3[]=[],sequenceByMonth=new Map<number,number>();
 for(const event of [...old.events].sort((a,b)=>a.month-b.month||a.id.localeCompare(b.id,'en'))){
  const targets:LifeEventV3[]=[];
  const envelope=(subject:string)=>{const sequence=sequenceByMonth.get(event.month)??0;sequenceByMonth.set(event.month,sequence+1);return {id:ids(root,'event',event.id,subject),month:event.month,sequence,dependsOn:[]};};
  if(event.type==='incomeChange'||event.type==='unemployment'){
   const rows=frame.rows.filter(row=>row.category==='income'),amount=event.type==='incomeChange'?event.amount:event.replacementIncome;
   if(!rows.length)throw Error('原收入事件沒有可對應的收入項目');
   let total=0n;
   for(const row of rows){
    const key=migrationRowKey(row),incomeId=ids(root,'row',key),raw=choices.eventAmounts[event.id]?.[key];
    // Only mathematically unique allocations are automatic. Positive multi-source amounts require explicit decisions.
    const value=raw!==undefined?parseMigrationMoney(raw):rows.length===1?amount:amount===0?0:null;
    if(value===null)throw Error('請明確分配每個收入項目的事件金額');total+=BigInt(value);
    targets.push(event.type==='incomeChange'?{...envelope(incomeId),type:'incomeChange',version:2,incomeId,amount:value}:{...envelope(incomeId),type:'unemployment',version:2,incomeId,duration:event.duration,replacementIncome:value});
   }
   if(total!==BigInt(amount))throw Error('事件分配合計必須等於原始彙總金額');
  }else if(event.type==='rentChange'){
   const rent=profile.expenses.filter(row=>row.kind==='rent');if(rent.length!==1)throw Error('原租金事件缺少唯一租金來源');
   targets.push({...envelope(rent[0].id),type:'rentChange',version:2,expenseId:rent[0].id,amount:event.amount});
  }else{
   if(!confirmLegacyZeroCosts)throw Error('請確認沿用舊購屋模型的零費用與零持有成本假設');
   const assetId=ids(root,'house',event.id),rate=legacyAnnualRateToPpm(event.annualRate);
   targets.push({...envelope(assetId),type:'buyHouse',version:3,assetId,name:'原購屋事件住宅',price:event.price,downPayment:event.downPayment,fee:0,holdingExpense:null,loan:event.price===event.downPayment?null:{liabilityId:ids(root,'mortgage',event.id),name:'原購屋事件房貸',annualRatePpm:rate,rateMode:'fixed',firstPaymentMonth:event.month,termMonths:event.termMonths},stopExpenseIds:'stopRent' in event&&event.stopRent?profile.expenses.filter(row=>row.kind==='rent').map(row=>row.id):[]});
  }
  plan.events.push({sourceId:event.id,targetEventIds:targets.map(target=>target.id)});events.push(...targets);
 }
 if(profile.incomes.length>20||profile.expenses.length>20||profile.assets.length>20||profile.liabilities.length>20||events.length>100)throw Error('轉換後項目或事件超過版本上限，請保留舊版或另建人生');
 return {profile,events,...(old.presentation?{presentation:structuredClone(old.presentation)}:{}),plan};
}
export function buildMigrationProposal(frames:MigrationFrame[],choices:Record<string,MigrationChoices>,ids:Ids,confirmLegacyZeroCosts:boolean){
 const proposals:ScenarioV3[]=[],mappings:V3MappingPlan[]=[];
 for(const frame of frames.filter(f=>f.context==='current')){
  const convert=(f:MigrationFrame)=>{try{const {plan,...state}=buildMigrationFrame(f,choices[f.key]??emptyMigrationChoices(),ids,confirmLegacyZeroCosts);mappings.push(plan);return state;}catch(error){throw Error(`${f.source.name} · ${f.context==='current'?'目前':'歷史'} R${f.revision}：${error instanceof Error?error.message:'配對失敗'}`);}};
  const current=convert(frame),old=frame.source;
  proposals.push({id:old.id,name:old.name,parentId:old.parentId,forkMonth:old.forkMonth,revision:old.revision,engineVersion:'3.0.0',...current,history:frames.filter(f=>f.scenarioId===old.id&&f.context==='history').map(f=>({revision:f.revision,...convert(f)}))});
 }
 return {proposals,mappings};
}
