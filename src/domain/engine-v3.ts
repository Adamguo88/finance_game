import {validateScenarioV3,MAX_V3_MONEY,type ScenarioV3,type LifeEventV3,type ScheduleV3} from './model-v3';

const MAX_SAFE=BigInt(Number.MAX_SAFE_INTEGER);
function safe(value:bigint):number{if(value>MAX_SAFE||value< -MAX_SAFE)throw Error('V3數值超出安全範圍');return Number(value);}
function roundPositive(numerator:bigint,denominator:bigint):bigint{return (2n*numerator+denominator)/(2n*denominator);}
/** Exact nominal-annual / 12 annuity; no floating point rate or rounding drift. */
export function loanPaymentV3(principal:number,annualRatePpm:number,termMonths:number):number{
 if(!Number.isSafeInteger(principal)||principal<0||principal>MAX_V3_MONEY||!Number.isInteger(annualRatePpm)||annualRatePpm<0||annualRatePpm>300000||!Number.isInteger(termMonths)||termMonths<1||termMonths>480)throw Error('V3貸款參數無效');
 const p=BigInt(principal),rate=BigInt(annualRatePpm),denominator=12000000n,n=BigInt(termMonths);
 if(rate===0n)return safe(roundPositive(p,n));
 const up=(denominator+rate)**n,down=denominator**n;
 return safe(roundPositive(p*rate*up,denominator*(up-down)));
}
export type FlowCategoryV3='income'|'expense'|'interest'|'principalDraw'|'principalRepay'|'assetPurchase'|'assetSale'|'investmentTransfer'|'fee'|'claim';
export interface CashFlowV3{sourceId:string;sourceKind:'entity'|'event';entityId:string;category:FlowCategoryV3;amount:number}
export interface EffectV3{sourceId:string;entityId:string;kind:'incomeChange'|'rentChange'|'assetCreated'|'liabilityCreated'|'expenseStopped';amount:number}
export interface ItemSnapshotV3{value:number;flow:number;active:boolean;sourceId:string;sourceKind:'entity'|'event';originEventId:string|null;kind:string}
export interface SnapshotV3{
 month:number;cash:number;assets:number;debt:number;netWorth:number;income:number;expenses:number;payment:number;interest:number;cashFlow:number;gap:boolean;employed:boolean;ownsHome:boolean;
 items:{incomes:Record<string,ItemSnapshotV3>;expenses:Record<string,ItemSnapshotV3>;assets:Record<string,ItemSnapshotV3>;liabilities:Record<string,ItemSnapshotV3>};flows:CashFlowV3[];effects:EffectV3[];
}
interface ItemState{ id:string;value:bigint;start:number;end:number|null;kind:string;sourceId:string;sourceKind:'entity'|'event';originEventId:string|null }
interface LoanState extends ItemState{schedule:ScheduleV3|null;remaining:number;due:bigint}
function source(id:string){return {sourceId:id,sourceKind:'entity' as const,originEventId:null};}
function active(item:ItemState,month:number){return item.start<=month&&(item.end===null||month<item.end);}
/** Canonical execution order for already validated events, also used by read-only timelines. */
export function orderV3Events(events:readonly LifeEventV3[]):LifeEventV3[]{
 const pending=[...events],seen=new Set<string>(),result:LifeEventV3[]=[];
 while(pending.length){
  const ready=pending.filter(e=>e.dependsOn.every(id=>seen.has(id))).sort((a,b)=>a.month-b.month||Number(a.type==='buyHouse')-Number(b.type==='buyHouse')||a.sequence-b.sequence||a.id.localeCompare(b.id,'en'));
  // validateScenarioV3 rejects missing/cyclic/future dependencies before this point.
  if(!ready.length)throw Error('無法排序V3事件依賴');
  const next=ready[0];pending.splice(pending.indexOf(next),1);result.push(next);seen.add(next.id);
 }
 return result;
}
/** Standalone staged engine. Production V1/V2 routing stays untouched until migration is ready. */
export function simulateV3(input:ScenarioV3,horizon=(90-input.profile.age)*12):SnapshotV3[]{
 const s=validateScenarioV3(input),p=s.profile;
 if(!Number.isInteger(horizon)||horizon<0||horizon>(90-p.age)*12)throw Error('無效V3模擬期間');
 let cash=BigInt(p.cash);
 const incomes:ItemState[]=p.incomes.map(x=>({id:x.id,value:BigInt(x.amount),start:0,end:x.endMonth,kind:x.kind,...source(x.id)}));
 const expenses:ItemState[]=p.expenses.map(x=>({id:x.id,value:BigInt(x.amount),start:0,end:x.endMonth,kind:x.kind,...source(x.id)}));
 const assets:ItemState[]=p.assets.map(x=>({id:x.id,value:BigInt(x.openingValue),start:0,end:null,kind:x.kind,...source(x.id)}));
 function createLoan(id:string,balance:number,schedule:ScheduleV3|null,start:number,originEventId:string|null):LoanState{return {id,value:BigInt(balance),start,end:null,kind:schedule?'amortizing':'static',...source(id),originEventId,schedule,remaining:schedule?.termMonths??0,due:schedule?BigInt(loanPaymentV3(balance,schedule.annualRatePpm,schedule.termMonths)):0n};}
 const loans:LoanState[]=p.liabilities.map(x=>createLoan(x.id,x.openingBalance,x.schedule,0,null));
 const events=orderV3Events(s.events),rows:SnapshotV3[]=[];
 for(let month=0;month<=horizon;month++){
  const opening=cash,flows:CashFlowV3[]=[],effects:EffectV3[]=[],incomeValues=new Map<string,bigint>(),expenseValues=new Map<string,bigint>();
  let income=0n,expense=0n,payment=0n,interest=0n;
  function post(item:Pick<ItemState,'id'|'sourceId'|'sourceKind'>,category:FlowCategoryV3,amount:bigint){
   // Check each posted amount and running balance, not only a potentially cancelling final sum.
   safe(amount);cash+=amount;safe(cash);
   if(amount!==0n)flows.push({sourceId:item.sourceId,sourceKind:item.sourceKind,entityId:item.id,category,amount:safe(amount)});
  }
  if(month>0){
   const current=events.filter(e=>e.month===month);
   for(const e of current){
    if(e.type==='incomeChange'||e.type==='rentChange'){
     const list=e.type==='incomeChange'?incomes:expenses,key=e.type==='incomeChange'?e.incomeId:e.expenseId,item=list.find(x=>x.id===key)!;
     item.value=BigInt(e.amount);item.sourceId=e.id;item.sourceKind='event';
     effects.push({sourceId:e.id,entityId:key,kind:e.type,amount:e.amount});
    }
   }
   // Phase 1: opening loans accrue once. Newly created loans accrue separately at phase 4.
   const accrued=new Map<string,bigint>();
   function accrue(loan:LoanState){return loan.schedule&&month>=loan.schedule.firstPaymentMonth&&loan.value>0n?roundPositive(loan.value*BigInt(loan.schedule.annualRatePpm),12000000n):0n;}
   for(const loan of loans)accrued.set(loan.id,accrue(loan));
   for(const e of current)if(e.type==='buyHouse'){
    const eventSource={sourceId:e.id,sourceKind:'event' as const};
    if(e.loan){
     const principal=e.price-e.downPayment;
     loans.push(createLoan(e.loan.liabilityId,principal,e.loan,e.month,e.id));
     post({id:e.loan.liabilityId,...eventSource},'principalDraw',BigInt(principal));
     effects.push({sourceId:e.id,entityId:e.loan.liabilityId,kind:'liabilityCreated',amount:principal});
    }
    assets.push({id:e.assetId,value:BigInt(e.price),start:month,end:null,kind:'property',...source(e.assetId),originEventId:e.id});
    post({id:e.assetId,...eventSource},'assetPurchase',-BigInt(e.price));
    post({id:e.assetId,...eventSource},'fee',-BigInt(e.fee));expense+=BigInt(e.fee);
    effects.push({sourceId:e.id,entityId:e.assetId,kind:'assetCreated',amount:e.price});
    for(const key of e.stopExpenseIds){expenses.find(x=>x.id===key)!.end=month;effects.push({sourceId:e.id,entityId:key,kind:'expenseStopped',amount:0});}
    if(e.holdingExpense){const x=e.holdingExpense;expenses.push({id:x.expenseId,value:BigInt(x.amount),start:month,end:null,kind:'holding',...source(x.expenseId),originEventId:e.id});}
   }
   for(const item of incomes){
    if(!active(item,month))continue;
    const pause=events.find((e):e is Extract<LifeEventV3,{type:'unemployment'}>=>e.type==='unemployment'&&e.incomeId===item.id&&e.month<=month&&month<e.month+e.duration);
    const value=pause?BigInt(pause.replacementIncome):item.value;
    incomeValues.set(item.id,value);income+=value;
    post(pause?{id:item.id,sourceId:pause.id,sourceKind:'event'}:item,'income',value);
   }
   for(const item of expenses){if(!active(item,month))continue;expenseValues.set(item.id,item.value);expense+=item.value;post(item,'expense',-item.value);}
   for(const loan of loans){
    if(!loan.schedule||loan.value===0n||month<loan.schedule.firstPaymentMonth)continue;
    const cost=accrued.get(loan.id)??accrue(loan),total=loan.value+cost;
    const due=loan.remaining===1?total:loan.due<total?loan.due:total;
    post(loan,'interest',-cost);post(loan,'principalRepay',-(due-cost));
    loan.value=total-due;loan.remaining--;payment+=due;interest+=cost;
    safe(loan.value);
   }
  }
  function snapshots(items:ItemState[],kind:'income'|'expense'|'asset'|'liability'):Record<string,ItemSnapshotV3>{return Object.fromEntries(items.map(item=>{
   const pause=kind==='income'&&month>0&&active(item,month)?events.find((e):e is Extract<LifeEventV3,{type:'unemployment'}>=>e.type==='unemployment'&&e.incomeId===item.id&&e.month<=month&&month<e.month+e.duration):undefined;
   const value=(kind==='income'||kind==='expense')&&!active(item,month)?0n:pause?BigInt(pause.replacementIncome):item.value;
   const itemFlow=kind==='income'?incomeValues.get(item.id)??0n:kind==='expense'?-(expenseValues.get(item.id)??0n):flows.filter(f=>f.entityId===item.id).reduce((sum,f)=>sum+BigInt(f.amount),0n);
   return [item.id,{value:safe(value),flow:safe(itemFlow),active:active(item,month)&&(kind!=='liability'||item.value>0n),sourceId:pause?.id??item.sourceId,sourceKind:pause?'event':item.sourceKind,originEventId:item.originEventId,kind:item.kind}];
  }));}
  const assetTotal=assets.reduce((sum,item)=>sum+item.value,0n),debt=loans.reduce((sum,item)=>sum+item.value,0n);
  rows.push({month,cash:safe(cash),assets:safe(assetTotal),debt:safe(debt),netWorth:safe(cash+assetTotal-debt),income:safe(income),expenses:safe(expense),payment:safe(payment),interest:safe(interest),cashFlow:safe(cash-opening),gap:cash<0n,employed:month===0?incomes.some(x=>active(x,month)&&x.kind==='salary'&&x.value>0n):incomes.some(x=>x.kind==='salary'&&(incomeValues.get(x.id)??0n)>0n),ownsHome:assets.some(x=>x.kind==='property'),items:{incomes:snapshots(incomes,'income'),expenses:snapshots(expenses,'expense'),assets:snapshots(assets,'asset'),liabilities:snapshots(loans,'liability')},flows,effects});
 }
 return rows;
}
