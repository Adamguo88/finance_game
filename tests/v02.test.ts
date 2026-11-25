import { describe, it, expect } from 'vitest';
import fixtures from '../docs/fixtures/v02-financial-contract.json';
import { initialProject, type ScenarioV2 } from '../src/domain/model';
import { simulate, validateScenario } from '../src/domain/engine';
import { migrateProject } from '../src/domain/migration';
import { changeEvents, changeProfile, forkScenario, parseProject } from '../src/domain/scenarios';

const v2=():ScenarioV2=>migrateProject(structuredClone(initialProject)).scenarios[0];
const common=(row:ReturnType<typeof simulate>[number])=>Object.fromEntries(Object.entries(row).filter(([k])=>['month','cash','assets','debt','netWorth','income','expenses','payment','interest','cashFlow','employed','ownsHome','gap'].includes(k)));

describe('V2 數值契約',()=>{
 for(const fixture of fixtures.cases){
  it(fixture.id,()=>{
   const scenario=v2();
   scenario.profile={...scenario.profile,...fixtures.baseProfile,...('profileOverrides' in fixture?fixture.profileOverrides:{})};
   scenario.events=('events' in fixture?fixture.events:[]) as ScenarioV2['events'];
   const rows=simulate(scenario,Math.max(...fixture.expected.map(row=>row.month)));
   for(const expected of fixture.expected)expect(rows[expected.month]).toMatchObject(expected);
  });
 }
 it('同月購屋先停止租金，再套用明確租金變更，事件排列不影響結果',()=>{
  const s=v2();s.profile.rent=1200000;
  s.events=[{id:'z-home',type:'buyHouse',version:2,month:1,price:100000000,downPayment:0,annualRate:0,termMonths:360,stopRent:true},{id:'a-rent',type:'rentChange',version:1,month:1,amount:500000}];
  expect(simulate(s,1)[1]).toMatchObject({rent:500000,expenses:3500000});
  expect(simulate(s,2)).toEqual(simulate({...s,events:[...s.events].reverse()},2));
 });
 it('拒絕重複同類同月事件、超額負債分配與損壞歷史',()=>{
  const s=v2();s.events=[{id:'a',type:'rentChange',version:1,month:2,amount:0},{id:'b',type:'rentChange',version:1,month:2,amount:1}];
  expect(()=>validateScenario(s)).toThrow();s.events=[];
  s.profile.debtSchedules=[{id:'d',openingBalance:1,annualRate:0,firstPaymentMonth:1,termMonths:1}];
  expect(()=>validateScenario(s)).toThrow();
  s.profile.debtSchedules=[];s.history=[{revision:1,profile:{...s.profile,rent:-1},events:[]}];
  expect(()=>validateScenario(s)).toThrow();
 });
 it('多筆貸款獨立取整、一分本金清償、負現金不新增債務',()=>{
  const s=v2();s.profile.cash=0;s.profile.income=0;s.profile.debt=2;
  s.profile.debtSchedules=['a','b'].map(id=>({id,openingBalance:1,annualRate:.3,firstPaymentMonth:1,termMonths:480}));
  const rows=simulate(s,2);expect(rows[1]).toMatchObject({debt:0,scheduledDebtInterest:0,scheduledDebtPayment:2,cash:-3000002,gap:true});expect(rows[2].debt).toBe(0);
 });
});

describe('V2 遷移與分支',()=>{
 it('完整轉換 current/history、識別及版本，不修改原檔且所有月份結果一致',()=>{
  const original=structuredClone(initialProject);const s=original.scenarios[0];
  s.profile.debt=123456;s.events=[{id:'home',type:'buyHouse',version:1,month:12,price:1000000000,downPayment:200000000,annualRate:.025,termMonths:360}];
  const changed=changeProfile(s,{...s.profile,income:6000000});
  original.scenarios=[changed as typeof s,forkScenario(changed,'child','分支',6) as typeof s];
  const before=JSON.stringify(original),converted=migrateProject(original);
  expect(JSON.stringify(original)).toBe(before);
  for(let i=0;i<original.scenarios.length;i++){
   const old=original.scenarios[i],next=converted.scenarios[i];
   expect(next).toMatchObject({id:old.id,revision:old.revision,parentId:old.parentId,forkMonth:old.forkMonth});
   expect(next.profile.version).toBe(old.profile.version);expect(next.history).toHaveLength(old.history.length);
   expect(simulate(next).map(common)).toEqual(simulate(old).map(common));
  }
  expect(parseProject(JSON.parse(JSON.stringify(converted)))).toEqual(converted);
 });
 it('子分支深拷貝排程、鎖定租金及薪資歷史、父子隔離',()=>{
  const s=v2();s.events=[{id:'rent',version:1,type:'rentChange',month:2,amount:1000000}];
  const child=forkScenario(s,'child','分支',6);const before=JSON.stringify(s);
  expect(()=>changeEvents(child,[])).toThrow();expect(()=>changeProfile(child,child.profile)).toThrow();
  const next=changeEvents(child,[...child.events,{id:'salary',version:1,type:'incomeChange',month:13,amount:7000000}]);
  expect(simulate(next,6)).toEqual(simulate(s,6));expect(JSON.stringify(s)).toBe(before);
  next.profile.debtSchedules.push({id:'d',openingBalance:1,annualRate:0,firstPaymentMonth:1,termMonths:1});expect(s.profile.debtSchedules).toEqual([]);
 });
 it('支援不同根方案混合引擎，拒絕跨版本父子與未知版本',()=>{
  const old=structuredClone(initialProject.scenarios[0]),next=v2();next.id='new';
  const p={schemaVersion:2,scenarios:[old,next],migration:null};
  expect(()=>parseProject(p)).not.toThrow();
  expect(()=>parseProject({...p,scenarios:[old,{...next,parentId:old.id,forkMonth:0}]})).toThrow();
  expect(()=>parseProject({...p,scenarios:[{...next,engineVersion:'9.0.0'}]})).toThrow();
 });
});

describe('V2 貸款與事件邊界',()=>{
 for(const [rate,term] of [[0,1],[0,480],[1e-15,360],[.3,480]] as const){
  it(`利率 ${rate}、${term} 期清償且本金不為負`,()=>{
   const s=v2();s.profile.debt=12000000;s.profile.debtSchedules=[{id:'d',openingBalance:12000000,annualRate:rate,firstPaymentMonth:1,termMonths:term}];
   const rows=simulate(s,term+1);
   expect(rows[term].scheduledDebtBalance).toBe(0);expect(rows[term+1].scheduledDebtPayment).toBe(0);
   expect(rows.every(row=>Number.isSafeInteger(row.cash)&&row.scheduledDebtBalance>=0)).toBe(true);
   for(let month=1;month<=term;month++){
    expect(rows[month].netWorth-rows[month-1].netWorth).toBe(rows[month].income-rows[month].expenses-rows[month].scheduledDebtInterest);
   }
  });
 }
 it('只在指定付款月算息，模擬終點不提前清償',()=>{
  const s=v2();s.profile.age=89;s.profile.debt=12000000;
  s.profile.debtSchedules=[{id:'late',openingBalance:12000000,annualRate:.12,firstPaymentMonth:12,termMonths:480}];
  const rows=simulate(s);
  expect(rows[11]).toMatchObject({scheduledDebtInterest:0,scheduledDebtPayment:0,scheduledDebtBalance:12000000});
  expect(rows[12].scheduledDebtBalance).toBeGreaterThan(0);expect(rows[12].scheduledDebtInterest).toBe(120000);
 });
 it('同月既有債務與房貸只扣一次本金，淨資產只受利息與收支影響',()=>{
  const s=v2();s.profile.debt=12000000;s.profile.cash=300000000;
  s.profile.debtSchedules=[{id:'old',openingBalance:12000000,annualRate:.12,firstPaymentMonth:1,termMonths:12}];
  s.events=[{id:'home',type:'buyHouse',version:2,month:1,price:1000000000,downPayment:200000000,annualRate:.025,termMonths:360,stopRent:false}];
  const [opening,end]=simulate(s,1);
  expect(end.cash).toBe(opening.cash-200000000+end.income-end.expenses-end.mortgagePayment-end.scheduledDebtPayment);
  expect(end.netWorth-opening.netWorth).toBe(end.income-end.expenses-end.mortgageInterest-end.scheduledDebtInterest);
  expect(end.payment).toBe(end.mortgagePayment);expect(end.interest).toBe(end.mortgageInterest);
 });
 it('相接失業覆蓋薪資，零租金合法，同月薪資重複拒絕',()=>{
  const s=v2();s.events=[{id:'a',type:'unemployment',version:1,month:1,duration:2,replacementIncome:100},{id:'b',type:'unemployment',version:1,month:3,duration:1,replacementIncome:200},{id:'salary',type:'incomeChange',version:1,month:2,amount:6000000},{id:'rent',type:'rentChange',version:1,month:2,amount:0}];
  const rows=simulate(s,4);expect(rows.map(row=>row.income)).toEqual([0,100,100,200,6000000]);expect(rows[2].rent).toBe(0);
  s.events.push({id:'duplicate',type:'incomeChange',version:1,month:2,amount:0});expect(()=>validateScenario(s)).toThrow();
 });
 it.each([NaN,Infinity,-1,.5,Number.MAX_SAFE_INTEGER])('拒絕無效金額 %s',value=>{
  const s=v2();s.profile.rent=value;expect(()=>validateScenario(s)).toThrow();
 });
 it('拒絕重複排程 ID、無效利率/期間/付款月，含 history',()=>{
  const s=v2();s.profile.debt=2;const schedule={id:'same',openingBalance:1,annualRate:0,firstPaymentMonth:1,termMonths:12};
  s.profile.debtSchedules=[schedule,{...schedule}];expect(()=>validateScenario(s)).toThrow('ID 重複');
  for(const invalid of [{annualRate:.31},{termMonths:0},{firstPaymentMonth:0}]){
   s.profile.debtSchedules=[{...schedule,...invalid}];expect(()=>validateScenario(s)).toThrow();
  }
  s.profile.debtSchedules=[];s.history=[{revision:1,profile:{...s.profile,debtSchedules:[{...schedule,openingBalance:3}]},events:[]}];expect(()=>validateScenario(s)).toThrow();
 });
});

describe('V2 遷移拒絕與版本隔離',()=>{
 it('轉換歷史購屋且不猜舊租金，不默默遺失 event 參數',()=>{
  let s=structuredClone(initialProject.scenarios[0]);
  s=changeEvents(s,[{id:'h',type:'buyHouse',version:1,month:3,price:100000000,downPayment:100,annualRate:1e-15,termMonths:480}]);
  s=changeEvents(s,[{...s.events[0],month:4}]);
  const original={...initialProject,scenarios:[s]},out=migrateProject(original);
  expect(out.scenarios[0].history[1].events[0]).toEqual({...s.history[1].events[0],version:2,stopRent:false});
  expect(out.scenarios[0].profile.rent).toBe(0);expect(out.scenarios[0].profile.expenses).toBe(s.profile.expenses);
  expect(migrateProject(original)).toEqual(migrateProject(original));
  expect(()=>migrateProject(out)).toThrow();
 });
 it('轉換超限結果拒絕，原始專案保持逐位元不變',()=>{
  const original=structuredClone(initialProject),s=original.scenarios[0];
  // Compact V1 fits, the rent/debtSchedules additions to every history entry exceed the limit.
  s.profile.id='x'.repeat(2100);
  s.history=Array.from({length:800},(_,i)=>({revision:i+1,profile:structuredClone(s.profile),events:[]}));
  s.revision=801;
  const size=new TextEncoder().encode(JSON.stringify(original)).length;
  const padding='x'.repeat(1_999_990-size);
  s.profile.id+=padding;
  const before=JSON.stringify(original);expect(new TextEncoder().encode(before).length).toBeLessThanOrEqual(2000000);
  expect(()=>migrateProject(original)).toThrow('2 MB');expect(JSON.stringify(original)).toBe(before);
 });
 it('未知/混搭參數版本及循環分支拒絕',()=>{
  const s=v2();
  const p={schemaVersion:2,scenarios:[s],migration:null};
  expect(()=>parseProject({...p,schemaVersion:99})).toThrow();
  expect(()=>parseProject({...p,scenarios:[{...s,profile:{...s.profile,extra:1}}]})).toThrow();
  expect(()=>parseProject({...p,scenarios:[{...s,events:[{id:'h',type:'buyHouse',version:1,month:1,price:1,downPayment:0,annualRate:0,termMonths:1}]}]})).toThrow();
  expect(()=>parseProject({...p,scenarios:[{...s,parentId:s.id,forkMonth:0}]})).toThrow();
 });
 it('未來事件不能移至分支點之前，父方案後改不傳播',()=>{
  const s=v2(),event={id:'salary',version:1 as const,type:'incomeChange' as const,month:13,amount:6000000};
  s.events=[event];const child=forkScenario(s,'c','子方案',6);
  expect(()=>changeEvents(child,[{...event,month:6}])).toThrow();
  const parent=changeProfile(s,{...s.profile,rent:1000000});
  expect(child.profile.rent).toBe(0);expect(parent.profile.rent).toBe(1000000);
 });
});

describe('顯示轉接與房貸狀態',()=>{
 it('V1 adapter 補明細不改通用快照，固定舊債不冒充房貸',async()=>{
  const {simulateForDisplay}=await import('../src/domain/engine');
  const {mapSnapshot}=await import('../src/scene/mapper');
  const s=structuredClone(initialProject.scenarios[0]);s.profile.debt=5000000;
  s.events=[{id:'home',type:'buyHouse',version:1,month:1,price:1000000,downPayment:0,annualRate:0,termMonths:1}];
  const rows=simulateForDisplay(s,2);
  expect(rows.map(common)).toEqual(simulate(s,2).map(common));
  expect(rows[1]).toMatchObject({mortgageBalance:0,unallocatedDebt:5000000,debt:5000000});
  expect(mapSnapshot(rows[1]).hasMortgage).toBe(false);
 });
 it('新版還款快照不將房貸與既有債務本息混合標示',async()=>{
  const {simulateForDisplay}=await import('../src/domain/engine');
  const s=v2();s.profile.debt=12000000;s.profile.debtSchedules=[{id:'d',openingBalance:12000000,annualRate:.12,firstPaymentMonth:1,termMonths:12}];
  const row=simulateForDisplay(s,1)[1];
  expect(row.payment).toBe(0);expect(row.interest).toBe(0);expect(row.scheduledDebtPayment).toBe(1066185);
 });
});
