import {describe,it,expect} from 'vitest';
import {validateScenarioV3,type ScenarioV3,type LifeEventV3} from '../src/domain/model-v3';
import {parseProject} from '../src/domain/scenarios';
const period={startMonth:0,endMonth:null};
function scenario():ScenarioV3{return {
 id:'v3',name:'分項人生',parentId:null,forkMonth:null,engineVersion:'3.0.0',revision:1,history:[],events:[],
 profile:{id:'profile',version:1,age:89,cash:10000000,
  incomes:[{...period,id:'salary',name:'薪資',kind:'salary',amount:5000000},{...period,id:'side',name:'兼職',kind:'side',amount:1000000}],
  expenses:[{...period,id:'living',name:'生活費',kind:'living',amount:2000000},{...period,id:'rent',name:'租金',kind:'rent',amount:1000000}],
  assets:[{...period,id:'asset',name:'其他資產',kind:'other',openingValue:20000000}],
  liabilities:[{...period,id:'loan-a',name:'貸款A',kind:'amortizing',openingBalance:120000,securedAssetId:null,schedule:{annualRatePpm:0,rateMode:'fixed',firstPaymentMonth:1,termMonths:12}},{...period,id:'loan-b',name:'貸款B',kind:'amortizing',openingBalance:240000,securedAssetId:null,schedule:{annualRatePpm:120000,rateMode:'variable',firstPaymentMonth:2,termMonths:24}}]
 }
};}
function change(id='change',incomeId='salary',month=2,sequence=0):LifeEventV3{return {id,incomeId,month,sequence,dependsOn:[],type:'incomeChange',version:2,amount:5500000};}
function pause(id='pause',incomeId='salary',month=1,sequence=1,duration=2):LifeEventV3{return {id,incomeId,month,sequence,dependsOn:[],type:'unemployment',version:2,duration,replacementIncome:0};}
function house():Extract<LifeEventV3,{type:'buyHouse'}>{return {id:'buy',type:'buyHouse',version:3,month:3,sequence:0,dependsOn:[],assetId:'home',name:'家',price:1000000000,downPayment:200000000,fee:1000000,loan:{liabilityId:'mortgage',name:'房貸',annualRatePpm:0,rateMode:'fixed',firstPaymentMonth:3,termMonths:360},holdingExpense:{expenseId:'maintenance',name:'維護',amount:0},stopExpenseIds:['rent']};}
describe('staged V3 model and semantic validation (production parser remains closed)',()=>{
 it('preserves independent sources, expenses and debt schedules without mutation',()=>{const s=scenario();s.events=[pause(),change()];const before=structuredClone(s),parsed=validateScenarioV3(s);expect(s).toEqual(before);expect(parsed).toEqual(before);expect(parsed).not.toBe(s);expect(parsed.profile.liabilities.map(l=>l.id)).toEqual(['loan-a','loan-b']);});
 it('accepts purchase references and explicit zero holding cost',()=>{const s=scenario();s.events=[house()];expect(validateScenarioV3(s).events).toEqual(s.events);});
 it('allows adjacent pauses and simultaneous pauses of independent sources',()=>{const s=scenario();s.events=[pause('a'),pause('b','salary',3),pause('c','side',1,2)];expect(()=>validateScenarioV3(s)).not.toThrow();});
 it('allows baseline change during pause, including end-of-horizon truncation',()=>{const s=scenario();s.events=[pause('a','salary',12,0,120),change('b','salary',12,1)];expect(()=>validateScenarioV3(s)).not.toThrow();});
 it('allows two independent targets to change the same month',()=>{const s=scenario();s.events=[change('a'),change('b','side',2,1)];expect(()=>validateScenarioV3(s)).not.toThrow();});
 it('accepts history with its own entities and schema, independent of current targets',()=>{const s=scenario();s.revision=2;const old=scenario();old.profile.incomes[0].id='old-salary';s.history=[{revision:1,profile:old.profile,events:[change('old','old-salary')]}];expect(()=>validateScenarioV3(s)).not.toThrow();});
 const invalid:Array<[string,(s:ScenarioV3)=>void]>=[
  ['cross-category duplicate entity ID',s=>{s.profile.expenses[0].id='salary';}],
  ['control character ID',s=>{s.profile.incomes[0].id='bad\n';}],
  ['initial entity starts later',s=>{s.profile.incomes[0].startMonth=1;}],
  ['empty period',s=>{s.profile.incomes[0].endMonth=0;}],
  ['period beyond horizon',s=>{s.profile.incomes[0].endMonth=14;}],
  ['implicit asset termination',s=>{s.profile.assets[0].endMonth=3;}],
  ['initial aggregate above money limit',s=>{s.profile.incomes[0].amount=1_000_000_000_000;}],
  ['fractional cents',s=>{s.profile.cash=0.5;}],
  ['fractional rate ppm',s=>{if(s.profile.liabilities[0].schedule)s.profile.liabilities[0].schedule.annualRatePpm=1.5;}],
  ['first payment outside horizon',s=>{if(s.profile.liabilities[0].schedule)s.profile.liabilities[0].schedule.firstPaymentMonth=13;}],
  ['future asset cannot secure initial loan',s=>{s.events=[house()];s.profile.liabilities[0].securedAssetId='home';}],
  ['unknown income target',s=>{s.events=[change('a','missing')];}],
  ['wrong target category',s=>{s.events=[change('a','living')];}],
  ['inactive target',s=>{s.profile.incomes[0].endMonth=2;s.events=[change()];}],
  ['pause outlasts source',s=>{s.profile.incomes[0].endMonth=3;s.events=[pause('a','salary',2,0,2)];}],
  ['overlapping pauses on one source',s=>{s.events=[pause('a'),pause('b','salary',2)];}],
  ['duplicate change to one target',s=>{s.events=[change('a'),change('b','salary',2,1)];}],
  ['duplicate event ID',s=>{s.events=[change(),{...change(),month:3}];}],
  ['duplicate same-month sequence',s=>{s.events=[change('a'),change('b','side')];}],
  ['event beyond horizon',s=>{s.events=[change('a','salary',13)];}],
  ['missing dependency',s=>{s.events=[{...change(),dependsOn:['missing']}];}],
  ['duplicate dependency',s=>{s.events=[change('a'),{...change('b','side',3),dependsOn:['a','a']}];}],
  ['future dependency',s=>{s.events=[{...change('a'),dependsOn:['b']},change('b','side',3)];}],
  ['dependency cycle',s=>{s.events=[{...change('a'),dependsOn:['b']},{...change('b','side',2,1),dependsOn:['a']}];}],
  ['same-month dependency violates financial phase',s=>{s.events=[house(),{...change('a','salary',3,1),dependsOn:['buy']}];}],
  ['rent change after stop',s=>{s.events=[house(),{id:'rent-up',type:'rentChange',version:2,month:4,sequence:0,dependsOn:[],expenseId:'rent',amount:1100000}];}],
  ['rent change on stop month',s=>{s.events=[house(),{id:'rent-up',type:'rentChange',version:2,month:3,sequence:1,dependsOn:[],expenseId:'rent',amount:1100000}];}],
  ['duplicate stopped expense',s=>{s.events=[{...house(),stopExpenseIds:['rent','rent']}];}],
  ['stopping non-rent expense',s=>{s.events=[{...house(),stopExpenseIds:['living']}];}],
  ['new asset duplicates existing ID',s=>{s.events=[{...house(),assetId:'asset'}];}],
  ['new liability duplicates asset ID',s=>{const e=house();e.loan!.liabilityId='home';s.events=[e];}],
  ['unfunded purchase',s=>{s.events=[{...house(),loan:null}];}],
  ['unnecessary zero-principal loan',s=>{s.events=[{...house(),downPayment:1000000000}];}],
  ['loan first payment before purchase',s=>{const e=house();e.loan!.firstPaymentMonth=2;s.events=[e];}],
  ['down payment above price',s=>{s.events=[{...house(),downPayment:1000000001}];}],
  ['malformed branch',s=>{s.parentId='parent';}],
  ['self parent',s=>{s.parentId=s.id;s.forkMonth=1;}],
  ['fork at terminal month',s=>{s.parentId='parent';s.forkMonth=12;}],
  ['invalid history target',s=>{s.revision=2;s.history=[{revision:1,profile:structuredClone(s.profile),events:[change('a','missing')]}];}],
  ['future history revision',s=>{s.history=[{revision:1,profile:structuredClone(s.profile),events:[]}];}]
 ];
 it.each(invalid)('rejects %s atomically',(_,mutate)=>{const s=scenario();mutate(s);const before=structuredClone(s);expect(()=>validateScenarioV3(s)).toThrow();expect(s).toEqual(before);});
 it('rejects unknown versions, fields and unregistered future types',()=>{const s=scenario();expect(()=>validateScenarioV3({...s,engineVersion:'3.1.0'})).toThrow();expect(()=>validateScenarioV3({...s,profile:{...s.profile,income:6000000}})).toThrow();expect(()=>validateScenarioV3({...s,events:[{...change(),type:'assetSale'}]})).toThrow();expect(()=>validateScenarioV3({...s,events:[{...change(),version:1}]})).toThrow();});
 it('does not expose unfinished schema5 through the existing import boundary',()=>{expect(()=>parseProject({schemaVersion:5,scenarios:[scenario()],migration:null})).toThrow();});
});
