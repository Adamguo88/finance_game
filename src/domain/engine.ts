import {ScenarioSchema} from './model';
import {validateDetails} from './initial-details';
import { type Scenario, type ScenarioV1, type ScenarioV2, type Snapshot, type SnapshotV2 } from './model';
import { simulate as simulateV1,validateScenario as validateScenarioV1 } from './engine-v1';
import { simulateV2,validateScenarioV2 } from './engine-v2';
export { payment } from './engine-v1';
export function financialScenario(input:Scenario):Scenario {
 const {initialDetails:_,...base}=input;
 return {...base,history:base.history.map(entry=>{const {initialDetails:__,...financial}=entry;return financial;})} as Scenario;
}
export function validateScenario(input:unknown):Scenario {
 const s=ScenarioSchema.parse(input);
 if(s.initialDetails)validateDetails(s.initialDetails,s.profile);
 for(const row of s.history)if(row.initialDetails)validateDetails(row.initialDetails,row.profile);
 const financial=financialScenario(s);
 if(financial.engineVersion==='2.0.0')validateScenarioV2(financial);else validateScenarioV1(financial);
 return s;
}
export function simulate(input:ScenarioV2,horizon?:number):SnapshotV2[];
export function simulate(input:ScenarioV1,horizon?:number):Snapshot[];
export function simulate(input:Scenario,horizon?:number):Snapshot[];
export function simulate(input:Scenario,horizon?:number):Snapshot[]{
 const financial=financialScenario(validateScenario(input));
 return financial.engineVersion==='2.0.0'?simulateV2(financial,horizon):simulateV1(financial,horizon);
}
/** UI adapter enriches legacy snapshots without changing the V1 calculation or export. */
export function simulateForDisplay(input:Scenario,horizon?:number):SnapshotV2[]{
 const financial=financialScenario(validateScenario(input));
 if(financial.engineVersion==='2.0.0')return simulateV2(financial,horizon);
 return simulateV1(financial,horizon).map(row=>({...row,baseIncome:input.profile.income,livingExpenses:row.expenses,rent:0,mortgagePayment:row.payment,mortgageInterest:row.interest,scheduledDebtPayment:0,scheduledDebtInterest:0,scheduledDebtBalance:0,unallocatedDebt:input.profile.debt,mortgageBalance:row.debt-input.profile.debt}));
}
