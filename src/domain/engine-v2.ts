import { ScenarioV2Schema, type ScenarioV2, type SnapshotV2, type DebtSchedule } from './model';
import { payment } from './engine-v1';

export function validateScenarioV2(input:unknown):ScenarioV2 {
 const s=ScenarioV2Schema.parse(input),horizon=(90-s.profile.age)*12;
 if((s.parentId===null)!==(s.forkMonth===null))throw new Error('分支資訊不完整');
 if(s.forkMonth!==null&&s.forkMonth>=horizon)throw new Error('無效分支點');
 const debtIds=new Set<string>();let allocated=0;
 for(const d of s.profile.debtSchedules){
  if(debtIds.has(d.id))throw new Error('負債排程 ID 重複');debtIds.add(d.id);
  if(d.firstPaymentMonth>horizon)throw new Error('負債排程超出 90 歲');
  allocated+=d.openingBalance;
 }
 if(allocated>s.profile.debt)throw new Error('負債排程本金合計不可超過既有負債');
 const ids=new Set<string>(),slots=new Set<string>(),jobs:Array<[number,number]>=[];let houses=0;
 for(const e of s.events){
  if(ids.has(e.id))throw new Error('事件 ID 重複');ids.add(e.id);
  if(e.month>horizon)throw new Error('事件超出 90 歲');
  if(e.type==='buyHouse'){
   if(e.downPayment>e.price)throw new Error('自備款不可高於房價');
   if(++houses>1)throw new Error('每個人生最多一間房屋');
  }else if(e.type==='unemployment'){
   const end=e.month+e.duration;
   if(jobs.some(([a,b])=>e.month<b&&end>a))throw new Error('失業事件期間不可重疊');
   jobs.push([e.month,end]);
  }else{
   const key=e.type+':'+e.month;
   if(slots.has(key))throw new Error('同月不可重複安排同類租金或薪資事件');slots.add(key);
  }
 }
 for(const entry of s.history)validateScenarioV2({...s,profile:entry.profile,events:entry.events,history:[]});
 return s;
}
interface Loan {balance:number;rate:number;remaining:number;monthly:number;start:number}
function createLoan(d:DebtSchedule):Loan {
 return {balance:d.openingBalance,rate:d.annualRate/12,remaining:d.termMonths,monthly:payment(d.openingBalance,d.annualRate,d.termMonths),start:d.firstPaymentMonth};
}
function pay(loan:Loan,month:number){
 if(month<loan.start||loan.balance===0)return {due:0,interest:0};
 const interest=Math.round(loan.balance*loan.rate);
 const due=Math.min(loan.balance+interest,loan.remaining===1?loan.balance+interest:Math.max(loan.monthly,interest+1));
 loan.balance=Math.max(0,loan.balance+interest-due);loan.remaining=Math.max(0,loan.remaining-1);
 return {due,interest};
}
export function simulateV2(input:ScenarioV2,horizon=(90-input.profile.age)*12):SnapshotV2[]{
 const s=validateScenarioV2(input),p=s.profile;
 if(!Number.isInteger(horizon)||horizon<0||horizon>(90-p.age)*12)throw new Error('無效模擬期間');
 let cash=p.cash,assets=p.assets,rent=p.rent,baseIncome=p.income,ownsHome=false;
 const loans=p.debtSchedules.map(createLoan),unallocatedDebt=p.debt-loans.reduce((n,d)=>n+d.balance,0);
 let mortgage:Loan|undefined;
 const events=[...s.events].sort((a,b)=>a.month-b.month||a.id.localeCompare(b.id,'en'));
 const result:SnapshotV2[]=[];
 for(let month=0;month<=horizon;month++){
  const opening=cash;
  let income=0,expenses=0,mortgagePayment=0,mortgageInterest=0,scheduledDebtPayment=0,scheduledDebtInterest=0;
  const job=month===0?undefined:events.find(e=>e.type==='unemployment'&&e.month<=month&&month<e.month+e.duration);
  if(month>0){
   const current=events.filter(e=>e.month===month);
   for(const e of current)if(e.type==='buyHouse'){
    cash-=e.downPayment;assets+=e.price;ownsHome=true;if(e.stopRent)rent=0;
    mortgage=createLoan({id:e.id,openingBalance:e.price-e.downPayment,annualRate:e.annualRate,termMonths:e.termMonths,firstPaymentMonth:month});
   }
   for(const e of current){if(e.type==='rentChange')rent=e.amount;if(e.type==='incomeChange')baseIncome=e.amount;}
   income=job?.type==='unemployment'?job.replacementIncome:baseIncome;
   expenses=p.expenses+rent;
   for(const loan of loans){const paid=pay(loan,month);scheduledDebtPayment+=paid.due;scheduledDebtInterest+=paid.interest;}
   if(mortgage){const paid=pay(mortgage,month);mortgagePayment=paid.due;mortgageInterest=paid.interest;}
   cash+=income-expenses-mortgagePayment-scheduledDebtPayment;
  }
  const scheduledDebtBalance=loans.reduce((n,d)=>n+d.balance,0),mortgageBalance=mortgage?.balance??0;
  const debt=unallocatedDebt+scheduledDebtBalance+mortgageBalance;
  const snapshot:SnapshotV2={month,cash,assets,debt,netWorth:cash+assets-debt,income,expenses,payment:mortgagePayment,interest:mortgageInterest,cashFlow:cash-opening,employed:!job,ownsHome,gap:cash<0,baseIncome,livingExpenses:month===0?0:p.expenses,rent:month===0?0:rent,mortgagePayment,mortgageInterest,scheduledDebtPayment,scheduledDebtInterest,scheduledDebtBalance,unallocatedDebt,mortgageBalance};
  if(!Object.values(snapshot).filter(v=>typeof v==='number').every(Number.isSafeInteger))throw new Error('數值超出安全範圍');
  result.push(snapshot);
 }
 return result;
}
