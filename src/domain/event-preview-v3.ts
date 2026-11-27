import {parseProjectV5} from './project-v5';
import {changeV3Events,type V3ScenarioBasis} from './scenarios-v3';
import {simulateV3} from './engine-v3';
import type {LifeEventV3,ScenarioV3} from './model-v3';
export const eventImpactFieldsV3=['cash','assets','debt','netWorth','income','expenses','payment','interest','cashFlow'] as const;
type Field=typeof eventImpactFieldsV3[number];
export interface EventImpactMonthV3 {month:number;before:Record<Field,number>;after:Record<Field,number>;delta:Record<Field,string>}
/** Sealed full-workspace preview; confirmation never writes storage or mutates its source. */
export function createV3EventEditSession(input:unknown,basis:V3ScenarioBasis,events:LifeEventV3[]){
 const source=parseProjectV5(input),signature=JSON.stringify(source),candidate=changeV3Events(source,basis,events);
 const old=source.scenarios.find(s=>s.id===basis.scenarioId) as ScenarioV3,next=candidate.scenarios.find(s=>s.id===basis.scenarioId) as ScenarioV3;
 const before=simulateV3(old),after=simulateV3(next);
 const months:EventImpactMonthV3[]=before.map((row,i)=>({month:row.month,before:Object.fromEntries(eventImpactFieldsV3.map(f=>[f,row[f]])) as Record<Field,number>,after:Object.fromEntries(eventImpactFieldsV3.map(f=>[f,after[i][f]])) as Record<Field,number>,delta:Object.fromEntries(eventImpactFieldsV3.map(f=>[f,(BigInt(after[i][f])-BigInt(row[f])).toString()])) as Record<Field,string>}));
 const changed=months.filter(row=>eventImpactFieldsV3.some(f=>row.delta[f]!=='0'));
 const summary={monthsCompared:months.length,changedMonths:changed.length,firstChangedMonth:changed[0]?.month??null,last:months[months.length-1],maxAbsoluteDelta:Object.fromEntries(eventImpactFieldsV3.map(f=>[f,months.reduce((max,row)=>{const n=BigInt(row.delta[f]),abs=n<0n?-n:n;return abs>max?abs:max;},0n).toString()])) as Record<Field,string>};
 let closed=false;
 function open(){if(closed)throw Error('預覽已取消或套用，請重新建立預覽');}
 return {getPreview(){open();return structuredClone({scenarioId:old.id,revision:old.revision,summary,months,events:next.events});},cancel(){closed=true;},confirm(current:unknown){open();if(JSON.stringify(parseProjectV5(current))!==signature)throw Error('工作資料已改變，請重新建立事件預覽');const result=parseProjectV5(candidate);closed=true;return result;}};
}
