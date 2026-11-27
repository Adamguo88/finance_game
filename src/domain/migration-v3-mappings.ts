import {z} from 'zod';
import {parseProject} from './scenarios';
import type {Scenario} from './model';
import {ScenarioV3Schema,validateScenarioV3,type ScenarioV3,type LifeEventV3} from './model-v3';
import {legacyAnnualRateToPpm,previewV3TreeComparison} from './migration-v3-preview';

const targetId=z.string().min(1).max(160),sourceId=z.string().min(1);
export const V3MappingPlanSchema=z.object({scenarioId:sourceId,revision:z.number().int().positive().max(Number.MAX_SAFE_INTEGER),context:z.enum(['current','history']),
 rows:z.array(z.object({category:z.enum(['income','expenses','assets','debt','rent']),sourceId:sourceId.nullable(),targetIds:z.array(targetId).max(20)}).strict()).max(81),
 schedules:z.array(z.object({sourceId,targetLiabilityId:targetId}).strict()).max(20),
 events:z.array(z.object({sourceId,targetEventIds:z.array(targetId).min(1).max(100)}).strict()).max(100),
 confirmLegacyZeroCosts:z.boolean()
}).strict();
export type V3MappingPlan=z.infer<typeof V3MappingPlanSchema>;
export interface LegacyRowV3{category:V3MappingPlan['rows'][number]['category'];sourceId:string|null;name:string;amount:number}
/** Lists source rows only; never pairs debts, allocates events or guesses classification. */
export function legacyRowsForV3(old:Scenario):LegacyRowV3[]{
 const rows:LegacyRowV3[]=[];
 for(const category of ['income','expenses','assets','debt'] as const){
  const details=old.initialDetails?.[category];
  if(details)for(const row of details)rows.push({category,sourceId:row.id,name:row.name,amount:row.amount});
  else rows.push({category,sourceId:null,name:'原有彙總',amount:old.profile[category]});
 }
 if('rent' in old.profile)rows.push({category:'rent',sourceId:null,name:'原有租金',amount:old.profile.rent});
 return rows;
}
const key=(...parts:unknown[])=>JSON.stringify(parts);
function sameSet(a:string[],b:string[]){return a.length===b.length&&new Set(a).size===a.length&&[...a].sort().join('\0')===[...b].sort().join('\0');}
function validateStateMappings(old:Scenario,next:ScenarioV3,plan:V3MappingPlan,stable:(key:string,ids:string[])=>void){
 if(old.profile.cash!==next.profile.cash)throw Error('遷移初始現金不可改變');
 const newRows=[...next.profile.incomes,...next.profile.expenses,...next.profile.assets,...next.profile.liabilities];
 if(newRows.some(x=>x.endMonth!==null)||next.profile.assets.some(x=>x.kind!=='other')||next.profile.liabilities.some(x=>x.securedAssetId!==null))throw Error('不得推測舊實體的期間、資產類型或擔保');
 const expected=legacyRowsForV3(old),rowMap=new Map(plan.rows.map(r=>[key(r.category,r.sourceId),r]));
 if(rowMap.size!==plan.rows.length||rowMap.size!==expected.length)throw Error('來源明細映射不完整或重複');
 const used=new Set<string>();
 for(const row of expected){
  const mapping=rowMap.get(key(row.category,row.sourceId));if(!mapping)throw Error('缺少來源明細映射');
  const targets=row.category==='income'?next.profile.incomes:row.category==='assets'?next.profile.assets:row.category==='debt'?next.profile.liabilities:next.profile.expenses;
  let total=0n;
  for(const id of mapping.targetIds){
   if(used.has(id))throw Error('實體被重複分配來源');used.add(id);
   const item=targets.find(x=>x.id===id);if(!item)throw Error('明細目標不存在或類型錯誤');
   if(row.category==='rent'&&item.kind!=='rent'||row.category==='expenses'&&'rent' in old.profile&&item.kind==='rent')throw Error('租金與生活費不可混配');
   total+=BigInt('amount' in item?item.amount:'openingValue' in item?item.openingValue:item.openingBalance);
  }
  if(total!==BigInt(row.amount))throw Error('來源明細金額分配不一致');
  // Debt details are source pools, not executable liabilities; adding/removing an old
  // schedule legitimately changes that pool's decomposition across revisions.
  if(row.category!=='debt')stable(key('row',row.category,row.sourceId),mapping.targetIds);
  else{const residual=mapping.targetIds.filter(id=>next.profile.liabilities.find(x=>x.id===id)?.kind==='static');if(residual.length)stable(key('debt-static',row.sourceId),residual);}
 }
 if(used.size!==newRows.length||newRows.some(x=>!used.has(x.id)))throw Error('存在未對應來源的初始實體');
 const schedules='debtSchedules' in old.profile?old.profile.debtSchedules:[],scheduleMap=new Map(plan.schedules.map(x=>[x.sourceId,x.targetLiabilityId])),allocated=new Set<string>();
 if(scheduleMap.size!==plan.schedules.length||scheduleMap.size!==schedules.length)throw Error('負債排程映射不完整或重複');
 for(const source of schedules){
  const id=scheduleMap.get(source.id),target=next.profile.liabilities.find(x=>x.id===id);
  if(!target||target.kind!=='amortizing'||allocated.has(target.id))throw Error('負債排程目標無效或重複');allocated.add(target.id);
  const rate=legacyAnnualRateToPpm(source.annualRate),a=target.schedule;
  if(target.openingBalance!==source.openingBalance||a.annualRatePpm!==rate||a.rateMode!=='fixed'||a.firstPaymentMonth!==source.firstPaymentMonth||a.termMonths!==source.termMonths)throw Error('負債排程參數不可默默改變');
  stable(key('schedule',source.id),[target.id]);
 }
 if(next.profile.liabilities.some(x=>x.kind==='amortizing'&&!allocated.has(x.id)))throw Error('未配置來源排程的負債須為static');
 const eventMap=new Map(next.events.map(e=>[e.id,e])),mappingMap=new Map(plan.events.map(e=>[e.sourceId,e.targetEventIds])),usedEvents=new Set<string>(),sequences=new Map<number,number>();
 if(mappingMap.size!==plan.events.length||mappingMap.size!==old.events.length)throw Error('事件映射不完整或重複');
 const sorted=[...old.events].sort((a,b)=>a.month-b.month||a.id.localeCompare(b.id,'en'));
 for(const event of sorted){
  const ids=mappingMap.get(event.id);if(!ids)throw Error('缺少來源事件映射');
  const targets:LifeEventV3[]=ids.map(id=>{const target=eventMap.get(id);if(!target||usedEvents.has(id))throw Error('事件目標無效或被重複分配');usedEvents.add(id);return target;});
  for(const target of targets){
   const sequence=sequences.get(event.month)??0;sequences.set(event.month,sequence+1);
   if(target.type!==event.type||target.month!==event.month||target.sequence!==sequence||target.dependsOn.length)throw Error('事件型別、月份或舊有效順序不一致');
  }
  if(event.type==='incomeChange'){
   const xs=targets.filter((e):e is Extract<LifeEventV3,{type:'incomeChange'}>=>e.type==='incomeChange');
   if(!sameSet(xs.map(e=>e.incomeId),next.profile.incomes.map(x=>x.id))||xs.reduce((sum,e)=>sum+BigInt(e.amount),0n)!==BigInt(event.amount))throw Error('彙總調薪須明確分配全部收入');
  }else if(event.type==='unemployment'){
   const xs=targets.filter((e):e is Extract<LifeEventV3,{type:'unemployment'}>=>e.type==='unemployment');
   if(!sameSet(xs.map(e=>e.incomeId),next.profile.incomes.map(x=>x.id))||xs.some(e=>e.duration!==event.duration)||xs.reduce((sum,e)=>sum+BigInt(e.replacementIncome),0n)!==BigInt(event.replacementIncome))throw Error('彙總中斷須明確分配全部收入與期間');
  }else if(event.type==='rentChange'){
   const xs=targets.filter((e):e is Extract<LifeEventV3,{type:'rentChange'}>=>e.type==='rentChange');
   if(!sameSet(xs.map(e=>e.expenseId),next.profile.expenses.filter(x=>x.kind==='rent').map(x=>x.id))||xs.reduce((sum,e)=>sum+BigInt(e.amount),0n)!==BigInt(event.amount))throw Error('彙總租金變更須明確分配全部租金');
  }else{
   const target=targets[0];
   if(targets.length!==1||target.type!=='buyHouse')throw Error('購屋來源須對應一個購屋事件');
   if(!plan.confirmLegacyZeroCosts||target.fee!==0||target.holdingExpense!==null)throw Error('須明確確認沿用舊模型零成本假設');
   const rate=legacyAnnualRateToPpm(event.annualRate),principal=event.price-event.downPayment,loan=target.loan;
   if(target.price!==event.price||target.downPayment!==event.downPayment)throw Error('購屋價款與自付不可默默改變');
   if(principal===0?loan!==null:loan===null||loan.annualRatePpm!==rate||loan.rateMode!=='fixed'||loan.firstPaymentMonth!==event.month||loan.termMonths!==event.termMonths)throw Error('購屋貸款參數不可默默改變');
   const rentIds='stopRent' in event&&event.stopRent?next.profile.expenses.filter(x=>x.kind==='rent').map(x=>x.id):[];
   if(!sameSet(target.stopExpenseIds,rentIds))throw Error('購屋停租目標與來源不一致');
  }
  // A global legacy event expands once per target. Sources can be added in later
  // profile revisions, so preserve each surviving (source event,target) identity.
  for(const target of targets){if(target.type==='buyHouse'){stable(key('event',event.id),[target.id]);stable(key('house-asset',event.id),[target.assetId]);if(target.loan)stable(key('house-loan',event.id),[target.loan.liabilityId]);}else{const subject='incomeId' in target?target.incomeId:target.expenseId;stable(key('event',event.id,subject),[target.id]);}}
 }
 if(usedEvents.size!==next.events.length)throw Error('存在未對應來源的新事件');
}
/** Validates explicit assignments before producing an all-month comparison. No schema5/apply/DB yet. */
export function validateV3SourceMappings(input:unknown,proposals:unknown,mappings:unknown){
 const source=parseProject(input);
 if(new TextEncoder().encode(JSON.stringify(proposals)).length>2_000_000||new TextEncoder().encode(JSON.stringify(mappings)).length>2_000_000)throw Error('遷移候選或映射超過2 MB');
 const candidates=z.array(ScenarioV3Schema).min(1).max(20).parse(proposals).map(validateScenarioV3);
 const plans=z.array(V3MappingPlanSchema).max(20020).parse(mappings),planMap=new Map(plans.map(p=>[key(p.scenarioId,p.context,p.revision),p]));
 if(planMap.size!==plans.length)throw Error('revision映射重複');
 const sourceMap=new Map<string,Scenario>(source.scenarios.map(s=>[s.id,s])),usedPlans=new Set<string>(),stableIds=new Map<string,string[]>();
 for(const next of candidates){
  const old=sourceMap.get(next.id);if(!old)throw Error('找不到來源方案');
  let root=old;while(root.parentId!==null)root=sourceMap.get(root.parentId)!;
  const states=[{context:'current' as const,revision:old.revision,old,next},...old.history.map((entry,i)=>{
   const {initialDetails:_details,presentation:_presentation,...base}=old;
   return {context:'history' as const,revision:entry.revision,old:{...base,...entry,history:[]} as Scenario,next:{...next,...next.history[i],history:[]} as ScenarioV3};
  })];
  if(old.history.length!==next.history.length)throw Error('歷史映射不完整');
  for(const state of states){
   const planKey=key(old.id,state.context,state.revision),plan=planMap.get(planKey);if(!plan)throw Error('缺少current或history映射');usedPlans.add(planKey);
   validateStateMappings(state.old,state.next,plan,(local,ids)=>{const stableKey=key(root.id,local),previous=stableIds.get(stableKey);if(previous&&!sameSet(previous,ids))throw Error('同一來源的穩定ID映射不一致');stableIds.set(stableKey,[...ids]);});
  }
 }
 if(usedPlans.size!==plans.length)throw Error('存在未使用的revision映射');
 return {comparison:previewV3TreeComparison(source,candidates),mappings:plans};
}
