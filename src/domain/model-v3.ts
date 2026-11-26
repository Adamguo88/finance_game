import {z} from 'zod';
import {AvatarPresentationSchema} from './avatar-metadata';

/** Staged V3 domain model. Not registered in the production project parser yet. */
export const V3_ENGINE_VERSION='3.0.0' as const;
export const MAX_V3_MONEY=1_000_000_000_000;
const id=z.string().min(1).max(160).regex(/^[^\u0000-\u001f\u007f]+$/);
const name=z.string().trim().min(1).max(80);
const money=z.number().int().min(0).max(MAX_V3_MONEY);
const month=z.number().int().min(1).max(864);
const version=z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const entity={id,name,startMonth:z.number().int().min(0).max(864),endMonth:z.number().int().min(1).max(865).nullable()};
export const IncomeV3Schema=z.object({...entity,amount:money,kind:z.enum(['salary','side','pension','other'])}).strict();
export const ExpenseV3Schema=z.object({...entity,amount:money,kind:z.enum(['living','rent','holding','dependent','education','premium','other'])}).strict();
export const AssetV3Schema=z.object({...entity,openingValue:money,kind:z.enum(['other','property','vehicle','investment'])}).strict();
export const ScheduleV3Schema=z.object({annualRatePpm:z.number().int().min(0).max(300000),rateMode:z.enum(['fixed','variable']),firstPaymentMonth:month,termMonths:z.number().int().min(1).max(480)}).strict();
export const LiabilityV3Schema=z.discriminatedUnion('kind',[
 z.object({...entity,openingBalance:money,kind:z.literal('static'),securedAssetId:id.nullable(),schedule:z.null()}).strict(),
 z.object({...entity,openingBalance:money.positive(),kind:z.literal('amortizing'),securedAssetId:id.nullable(),schedule:ScheduleV3Schema}).strict()
]);
export const ProfileV3Schema=z.object({id,version,age:z.number().int().min(18).max(89),cash:money,incomes:z.array(IncomeV3Schema).max(20),expenses:z.array(ExpenseV3Schema).max(20),assets:z.array(AssetV3Schema).max(20),liabilities:z.array(LiabilityV3Schema).max(20)}).strict();
const envelope={id,month,sequence:z.number().int().min(0).max(9999),dependsOn:z.array(id).max(100)};
export const EventV3Schema=z.discriminatedUnion('type',[
 z.object({...envelope,type:z.literal('incomeChange'),version:z.literal(2),incomeId:id,amount:money}).strict(),
 z.object({...envelope,type:z.literal('unemployment'),version:z.literal(2),incomeId:id,duration:z.number().int().min(1).max(120),replacementIncome:money}).strict(),
 z.object({...envelope,type:z.literal('rentChange'),version:z.literal(2),expenseId:id,amount:money}).strict(),
 z.object({...envelope,type:z.literal('buyHouse'),version:z.literal(3),assetId:id,name,price:money.positive(),downPayment:money,fee:money,
  loan:ScheduleV3Schema.extend({liabilityId:id,name}).strict().nullable(),
  holdingExpense:z.object({expenseId:id,name,amount:money}).strict().nullable(),stopExpenseIds:z.array(id).max(120)
 }).strict()
]);
const state={profile:ProfileV3Schema,events:z.array(EventV3Schema).max(100),presentation:AvatarPresentationSchema.optional()};
export const ScenarioV3Schema=z.object({id,name,parentId:id.nullable(),forkMonth:z.number().int().min(0).max(863).nullable(),engineVersion:z.literal(V3_ENGINE_VERSION),revision:version,...state,history:z.array(z.object({revision:version,...state}).strict()).max(1000)}).strict();
export type ProfileV3=z.infer<typeof ProfileV3Schema>;
export type LifeEventV3=z.infer<typeof EventV3Schema>;
export type ScenarioV3=z.infer<typeof ScenarioV3Schema>;
export type LiabilityV3=z.infer<typeof LiabilityV3Schema>;
export type ScheduleV3=z.infer<typeof ScheduleV3Schema>;

type Definition={kind:'income'|'expense'|'asset'|'liability';start:number;end:number|null;subtype:string};
function validateState(profile:ProfileV3,events:LifeEventV3[]){
 const horizon=(90-profile.age)*12;
 const definitions=new Map<string,Definition>();
 function define(key:string,definition:Definition){
  if(definitions.has(key))throw Error('財務實體 ID 重複');
  if(definition.start>horizon||definition.end!==null&&(definition.end<=definition.start||definition.end>horizon+1))throw Error('實體期間無效');
  definitions.set(key,definition);
 }
 const groups=[['income',profile.incomes,'amount'],['expense',profile.expenses,'amount'],['asset',profile.assets,'openingValue'],['liability',profile.liabilities,'openingBalance']] as const;
 for(const [kind,rows,field]of groups){
  let total=0n;
  for(const row of rows){
   if(row.startMonth!==0)throw Error('初始實體必須從月0開始');
   if((kind==='asset'||kind==='liability')&&row.endMonth!==null)throw Error('資產或負債不可隱式終止');
   total+=BigInt((row as unknown as Record<string,number>)[field]);
   define(row.id,{kind,start:row.startMonth,end:row.endMonth,subtype:row.kind});
  }
  if(total>BigInt(MAX_V3_MONEY))throw Error('初始分項合計超過金額上限');
 }
 const eventMap=new Map<string,LifeEventV3>(),sequences=new Set<string>();
 let houses=0;
 for(const e of events){
  if(eventMap.has(e.id))throw Error('事件 ID 重複');eventMap.set(e.id,e);
  if(e.month>horizon)throw Error('事件超出人生終點');
  const slot=e.month+':'+e.sequence;if(sequences.has(slot))throw Error('同月 sequence 重複');sequences.add(slot);
  if(e.type==='buyHouse'){
   if(++houses>1)throw Error('首批模型最多一筆購屋事件');
   if(e.downPayment>e.price)throw Error('自備款不可超過價款');
   if((e.loan===null)!==(e.price===e.downPayment))throw Error('貸款與價款差額不一致');
   if(e.loan&&(e.loan.firstPaymentMonth<e.month||e.loan.firstPaymentMonth>horizon))throw Error('貸款首付月份無效');
   define(e.assetId,{kind:'asset',start:e.month,end:null,subtype:'property'});
   if(e.loan)define(e.loan.liabilityId,{kind:'liability',start:e.month,end:null,subtype:'amortizing'});
   if(e.holdingExpense)define(e.holdingExpense.expenseId,{kind:'expense',start:e.month,end:null,subtype:'holding'});
  }
 }
 for(const liability of profile.liabilities){
  if(liability.schedule&&liability.schedule.firstPaymentMonth>horizon)throw Error('負債首付超出人生終點');
  if(liability.securedAssetId!==null){const asset=definitions.get(liability.securedAssetId);if(!asset||asset.kind!=='asset'||asset.start!==0)throw Error('初始擔保資產不存在');}
 }
 function target(key:string,kind:Definition['kind'],at:number,end=at+1,subtype?:string){
  const d=definitions.get(key);
  if(!d||d.kind!==kind||subtype&&d.subtype!==subtype)throw Error('事件目標不存在或類型不符');
  if(d.start>at||d.end!==null&&Math.min(end,horizon+1)>d.end)throw Error('事件目標尚未生效或已終止');
  return d;
 }
 const stopped=new Map<string,number>();
 for(const e of events)if(e.type==='buyHouse'){
  if(new Set(e.stopExpenseIds).size!==e.stopExpenseIds.length)throw Error('停租目標重複');
  for(const expenseId of e.stopExpenseIds){target(expenseId,'expense',e.month,e.month+1,'rent');stopped.set(expenseId,e.month);}
 }
 const changes=new Set<string>(),pauses=new Map<string,Array<[number,number]>>();
 for(const e of events){
  if(e.type==='incomeChange'||e.type==='unemployment')target(e.incomeId,'income',e.month,e.type==='unemployment'?e.month+e.duration:e.month+1);
  if(e.type==='rentChange'){
   target(e.expenseId,'expense',e.month,e.month+1,'rent');
   if((stopped.get(e.expenseId)??Infinity)<=e.month)throw Error('租金已由購屋事件終止');
  }
  if(e.type==='incomeChange'||e.type==='rentChange'){
   const slot=e.type+':'+(e.type==='incomeChange'?e.incomeId:e.expenseId)+':'+e.month;
   if(changes.has(slot))throw Error('同月重複設定目標金額');changes.add(slot);
  }
  if(e.type==='unemployment'){
   const spans=pauses.get(e.incomeId)??[],end=e.month+e.duration;
   if(spans.some(([a,b])=>e.month<b&&end>a))throw Error('同收入中斷期間重疊');
   spans.push([e.month,end]);pauses.set(e.incomeId,spans);
  }
 }
 const visiting=new Set<string>(),visited=new Set<string>();
 function visit(e:LifeEventV3){
  if(visiting.has(e.id))throw Error('事件依賴循環');if(visited.has(e.id))return;
  visiting.add(e.id);
  if(new Set(e.dependsOn).size!==e.dependsOn.length)throw Error('事件依賴重複');
  for(const key of e.dependsOn){
   const dependency=eventMap.get(key);
   if(!dependency)throw Error('找不到依賴事件');
   if(dependency.month>e.month)throw Error('不可依賴未來事件');
   if(dependency.month===e.month&&e.type!=='buyHouse'&&dependency.type==='buyHouse')throw Error('依賴與財務階段衝突');
   visit(dependency);
  }
  visiting.delete(e.id);visited.add(e.id);
 }
 for(const e of events)visit(e);
}
export function validateScenarioV3(input:unknown):ScenarioV3{
 const s=ScenarioV3Schema.parse(input),horizon=(90-s.profile.age)*12;
 if((s.parentId===null)!==(s.forkMonth===null)||s.parentId===s.id||s.forkMonth!==null&&s.forkMonth>=horizon)throw Error('分支資訊無效');
 validateState(s.profile,s.events);
 const revisions=new Set<number>();
 for(const entry of s.history){
  if(entry.revision>=s.revision||revisions.has(entry.revision))throw Error('歷史 revision 無效');
  revisions.add(entry.revision);validateState(entry.profile,entry.events);
  if(s.forkMonth!==null&&s.forkMonth>=(90-entry.profile.age)*12)throw Error('歷史分支點無效');
 }
 return s;
}
