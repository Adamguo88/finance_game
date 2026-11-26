import {it,expect} from 'vitest';
import {initialProject} from '../src/domain/model';
import {migrateProject} from '../src/domain/migration';
import {changeProfile,changeEvents,forkScenario,parseProject,replaceScenario} from '../src/domain/scenarios';
import {detailsFromProfile} from '../src/domain/initial-details';
import {simulate} from '../src/domain/engine';
import {exportProject,importProject} from '../src/storage/project';
const source=()=>migrateProject(initialProject);
it('多筆明細保存及schema3轉換逐分保留全部月份與來源',()=>{
 const p=source(),s=p.scenarios[0],before=structuredClone(p),d=detailsFromProfile(s.profile);
 d.income=[{id:'a',name:'薪資',amount:3000000},{id:'b',name:'接案',amount:2000000}];
 const next=changeProfile(s,s.profile,d),result=replaceScenario(p,next);
 expect(result.schemaVersion).toBe(3);expect(simulate(next)).toEqual(simulate(s));expect(p).toEqual(before);
 expect(importProject(exportProject(result))).toEqual(result);expect(result.scenarios[0].initialDetails).toEqual(d);
 expect(()=>parseProject({...result,schemaVersion:2})).toThrow();
});
it('明細不重複計租金、負債與還款，直接摘要編輯保存舊明細',()=>{
 const p=source(),s=p.scenarios[0],profile={...s.profile,expenses:2000000,rent:1000000,debt:120000,debtSchedules:[{id:'loan',openingBalance:120000,annualRate:0,termMonths:12,firstPaymentMonth:1}]};
 const next=changeProfile(s,profile,detailsFromProfile(profile));expect(simulate(next,1)[1].cashFlow).toBe(1990000);
 const changed=changeProfile(next,{...profile,income:6000000});expect(changed.initialDetails!.income[0].amount).toBe(6000000);expect(changed.history.at(-1)!.initialDetails).toEqual(next.initialDetails);
 const event=changeEvents(next,[{id:'raise',version:1,type:'incomeChange',month:2,amount:7000000}]);expect(event.history.at(-1)!.initialDetails).toEqual(next.initialDetails);
});
it('子分支明細深拷貝、初始資料鎖定、父變更隔離',()=>{
 const s=source().scenarios[0],next=changeProfile(s,s.profile,detailsFromProfile(s.profile)),b=forkScenario(next,'child','分支',6),copy=structuredClone(b);
 expect(b.initialDetails).not.toBe(next.initialDetails);changeProfile(next,{...next.profile,income:6000000});expect(b).toEqual(copy);
 expect(()=>changeProfile(b,b.profile,b.initialDetails)).toThrow();expect(simulate(b,6)).toEqual(simulate(next,6));
});
it('重複ID、未知版本、總額不一致與無效金額拒絕，舊格式不變',()=>{
 const p=source(),s=p.scenarios[0],d=detailsFromProfile(s.profile);
 for(const invalid of [{...d,version:99},{...d,income:[...d.income,...d.income]},{...d,income:[]},{...d,income:[{id:'x',name:'',amount:1}]},{...d,income:[{id:'x',name:'x',amount:1.5}]}])expect(()=>changeProfile(s,s.profile,invalid as typeof d)).toThrow();
 expect(importProject(exportProject(initialProject))).toEqual(initialProject);expect(importProject(exportProject(p))).toEqual(p);
});
