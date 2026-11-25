import { ScenarioSchema, type Scenario, type Snapshot } from './model';
export function payment(principal:number, annualRate:number, months:number):number {
 if (!Number.isSafeInteger(principal)||principal<0||!Number.isFinite(annualRate)||annualRate<0||annualRate>0.3||!Number.isInteger(months)||months<1||months>480) throw new Error('無效貸款參數');
 if(principal===0)return 0;
 const r=annualRate/12;
 return Math.round(r===0?principal/months:principal*r/(-Math.expm1(-months*Math.log1p(r))));
}
export function validateScenario(input:unknown):Scenario {
 const s=ScenarioSchema.parse(input);
 if(s.forkMonth!==null&&s.forkMonth>=(90-s.profile.age)*12)throw new Error('無效分支點');
 const ids=new Set<string>(); let houses=0;
 const jobWindows:Array<[number,number]>=[];
 for(const e of s.events){
  if(ids.has(e.id)) throw new Error('事件 ID 重複'); ids.add(e.id);
  if(e.month>(90-s.profile.age)*12)throw new Error('事件超出 90 歲');
  if(e.type==='buyHouse'){
   if(e.downPayment>e.price)throw new Error('自備款不可高於房價');
   if(++houses>1)throw new Error('v0.1 每個人生最多一間房屋');
  } else {
   const end=e.month+e.duration;
   if(jobWindows.some(([a,b])=>e.month<b&&end>a))throw new Error('失業事件期間不可重疊');
   jobWindows.push([e.month,end]);
  }
 }
 for(const entry of s.history){
  validateScenario({...s,profile:entry.profile,events:entry.events,history:[]});
 }
 if((s.parentId===null)!==(s.forkMonth===null)) throw new Error('分支資訊不完整');
 return s;
}
export function simulate(input:Scenario, horizon=(90-input.profile.age)*12):Snapshot[]{
 const s=validateScenario(input);
 if(!Number.isInteger(horizon)||horizon<0||horizon>(90-s.profile.age)*12)throw new Error('無效模擬期間');
 const p=s.profile;
 let cash=p.cash,assets=p.assets,balance=0,rate=0,remaining=0,monthly=0,ownsHome=false;
 const result:Snapshot[]=[{month:0,cash,assets,debt:p.debt,netWorth:cash+assets-p.debt,income:0,expenses:0,payment:0,interest:0,cashFlow:0,employed:true,ownsHome:false,gap:cash<0}];
 // Input order has no effect; event IDs break same-month ties.
 const events=[...s.events].sort((a,b)=>a.month-b.month||a.id.localeCompare(b.id,'en'));
 for(let m=1;m<=horizon;m++){
  const opening=cash;
  for(const e of events.filter(e=>e.month===m)){
   if(e.type==='buyHouse'){
    cash-=e.downPayment; assets+=e.price; balance=e.price-e.downPayment; rate=e.annualRate/12;
    remaining=e.termMonths; monthly=payment(balance,e.annualRate,e.termMonths); ownsHome=true;
   }
  }
  const job=events.find(e=>e.type==='unemployment'&&e.month<=m&&m<e.month+e.duration);
  const employed=!job;
  const income=job?.type==='unemployment'?job.replacementIncome:p.income;
  const interest=Math.round(balance*rate);
  const due=balance>0?Math.min(balance+interest,remaining===1?balance+interest:Math.max(monthly,interest+1)):0;
  balance=Math.max(0,balance+interest-due); remaining=Math.max(0,remaining-1);
  cash+=income-p.expenses-due;
  const debt=p.debt+balance;
  const snapshot:Snapshot={month:m,cash,assets,debt,netWorth:cash+assets-debt,income,expenses:p.expenses,payment:due,interest,cashFlow:cash-opening,employed,ownsHome,gap:cash<0};
  if(!Object.values(snapshot).filter(v=>typeof v==='number').every(v=>Number.isSafeInteger(v)))throw new Error('數值超出安全範圍');
  result.push(snapshot);
 }
 return result;
}
