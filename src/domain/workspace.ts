import {parseProject} from './scenarios';
import {parseProjectV5,type ProjectV5} from './project-v5';
import {simulateForDisplay} from './engine';
import {simulateV3} from './engine-v3';
import type {Project,Scenario} from './model';
import type {ScenarioV3} from './model-v3';
export type StoredProject=Project|ProjectV5;
export type StoredScenario=Scenario|ScenarioV3;
/** Version dispatch at the workspace boundary; legacy parser/engines keep their original contracts. */
export function parseStoredProject(input:unknown):StoredProject{
 return input!==null&&typeof input==='object'&&'schemaVersion' in input&&input.schemaVersion===5?parseProjectV5(input):parseProject(input);
}
export function simulateStoredScenario(input:StoredScenario,horizon?:number){
 if(input.engineVersion==='3.0.0')return simulateV3(input,horizon);
 // The shared overview labels total debt service. Existing V1/V2 display APIs remain unchanged.
 return simulateForDisplay(input,horizon).map(row=>({...row,payment:row.mortgagePayment+row.scheduledDebtPayment,interest:row.mortgageInterest+row.scheduledDebtInterest}));
}
