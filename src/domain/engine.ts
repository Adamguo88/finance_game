import { type Scenario, type ScenarioV1, type ScenarioV2, type Snapshot, type SnapshotV2 } from './model';
import { simulate as simulateV1,validateScenario as validateScenarioV1 } from './engine-v1';
import { simulateV2,validateScenarioV2 } from './engine-v2';
export { payment } from './engine-v1';
export function validateScenario(input:unknown):Scenario {
 if(typeof input==='object'&&input!==null&&'engineVersion' in input&&input.engineVersion==='2.0.0')return validateScenarioV2(input);
 return validateScenarioV1(input);
}
export function simulate(input:ScenarioV2,horizon?:number):SnapshotV2[];
export function simulate(input:ScenarioV1,horizon?:number):Snapshot[];
export function simulate(input:Scenario,horizon?:number):Snapshot[];
export function simulate(input:Scenario,horizon?:number):Snapshot[]{
 return input.engineVersion==='2.0.0'?simulateV2(input,horizon):simulateV1(input,horizon);
}
/** UI adapter enriches legacy snapshots without changing the V1 calculation or export. */
export function simulateForDisplay(input:Scenario,horizon?:number):SnapshotV2[]{
 if(input.engineVersion==='2.0.0')return simulateV2(input,horizon);
 return simulateV1(input,horizon).map(row=>({...row,baseIncome:input.profile.income,livingExpenses:row.expenses,rent:0,mortgagePayment:row.payment,mortgageInterest:row.interest,scheduledDebtPayment:0,scheduledDebtInterest:0,scheduledDebtBalance:0,unallocatedDebt:input.profile.debt,mortgageBalance:row.debt-input.profile.debt}));
}
