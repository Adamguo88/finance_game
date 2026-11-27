import type {LifeEventV3,ScenarioV3} from '../domain/model-v3';
import {parseMigrationMoney as cents} from './itemized-migration';
export const eventNamesV3={incomeChange:'調整指定收入',unemployment:'暫停指定收入',rentChange:'調整指定租金',buyHouse:'購買住宅'};
export function centsInput(value:number){const n=BigInt(value);return `${n/100n}.${String(n%100n).padStart(2,'0')}`;}
export function percentInput(ppm:number){return `${Math.floor(ppm/10000)}.${String(ppm%10000).padStart(4,'0')}`;}
export function parsePercentPpm(value:string){if(value.length>7||!/^\d{1,2}(?:\.\d{1,4})?$/.test(value))throw Error('年利率請輸入0–30%，最多四位小數');const [whole,fraction='']=value.split('.'),ppm=Number(BigInt(whole)*10000n+BigInt(fraction.padEnd(4,'0')));if(ppm>300000)throw Error('年利率不可超過30%');return ppm;}
export function createEventDraftV3(type:LifeEventV3['type'],scenario:ScenarioV3,currentMonth:number,id:()=>string):LifeEventV3{
 if(scenario.events.length>=100)throw Error('此人生已達100個事件上限');
 const horizon=(90-scenario.profile.age)*12,month=Math.max(currentMonth+1,(scenario.forkMonth??0)+1);
 if(month>horizon)throw Error('已到人生終點，請先回到較早月份');
 const sequence=Math.max(-1,...scenario.events.filter(e=>e.month===month).map(e=>e.sequence))+1,base={id:id(),month,sequence,dependsOn:[]};
 if(type==='incomeChange')return {...base,type,version:2,incomeId:'',amount:0};
 if(type==='unemployment')return {...base,type,version:2,incomeId:'',duration:1,replacementIncome:0};
 if(type==='rentChange')return {...base,type,version:2,expenseId:'',amount:0};
 if(scenario.events.some(e=>e.type==='buyHouse'))throw Error('此人生已有住宅購買事件，請編輯原事件');
 return {...base,type,version:3,assetId:id(),name:'住宅',price:0,downPayment:0,fee:0,loan:{liabilityId:id(),name:'房貸',annualRatePpm:0,rateMode:'fixed',firstPaymentMonth:month,termMonths:12},holdingExpense:null,stopExpenseIds:[]};
}
export function readEventFormV3(initial:LifeEventV3,data:FormData,extra:{loanId:string;holdingId:string}):LifeEventV3{
 const text=(key:string)=>{const value=data.get(key);if(typeof value!=='string')throw Error('請填寫完整事件參數');return value;};
 const integer=(key:string)=>{const raw=text(key);if(!/^\d{1,5}$/.test(raw))throw Error('月份、期數與順序請輸入完整整數');return Number(raw);};
 const multiple=(key:string)=>data.getAll(key).map(v=>{if(typeof v!=='string')throw Error('事件關聯格式無效');return v;});
 const base={id:initial.id,month:integer('month'),sequence:integer('sequence'),dependsOn:multiple('dependsOn')};
 if(initial.type==='incomeChange')return {...base,type:initial.type,version:2,incomeId:text('target'),amount:cents(text('amount'))};
 if(initial.type==='unemployment')return {...base,type:initial.type,version:2,incomeId:text('target'),duration:integer('duration'),replacementIncome:cents(text('replacementIncome'))};
 if(initial.type==='rentChange')return {...base,type:initial.type,version:2,expenseId:text('target'),amount:cents(text('amount'))};
 return {...base,type:'buyHouse',version:3,assetId:initial.assetId,name:text('name'),price:cents(text('price')),downPayment:cents(text('downPayment')),fee:cents(text('fee')),
  loan:data.has('loanEnabled')?{liabilityId:initial.loan?.liabilityId??extra.loanId,name:text('loanName'),annualRatePpm:parsePercentPpm(text('annualRate')),rateMode:initial.loan?.rateMode??'fixed',firstPaymentMonth:integer('firstPaymentMonth'),termMonths:integer('termMonths')}:null,
  holdingExpense:data.has('holdingEnabled')?{expenseId:initial.holdingExpense?.expenseId??extra.holdingId,name:text('holdingName'),amount:cents(text('holdingAmount'))}:null,stopExpenseIds:multiple('stopExpenseIds')};
}
