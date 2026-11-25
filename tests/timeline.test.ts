import {it,expect} from 'vitest';
import {initialProject} from '../src/domain/model';
import {migrateProject} from '../src/domain/migration';
import {simulate} from '../src/domain/engine';
import {forkScenario} from '../src/domain/scenarios';
import {rescheduleEvent} from '../src/domain/timeline';
const source=()=>{const s=migrateProject(initialProject).scenarios[0];s.events=[{id:'pay',type:'incomeChange' as const,version:1 as const,month:12,amount:6000000}];return s;};
it('移動薪資事件只改月份、保留歷史並在新月份改算',()=>{
 const s=source(),before=structuredClone(s),next=rescheduleEvent(s,'pay',13);
 expect(s).toEqual(before);expect(next.events[0]).toEqual({...s.events[0],month:13});
 expect(next.history.at(-1)).toEqual({revision:s.revision,profile:s.profile,events:s.events});
 expect(next.revision).toBe(s.revision+1);expect(next.profile).toEqual(s.profile);
 expect(simulate(next,13)[12].income).toBe(5000000);expect(simulate(next,13)[13].income).toBe(6000000);
});
it('無移動不新增歷史，未知事件及無效月份明確拒絕',()=>{
 const s=source();expect(rescheduleEvent(s,'pay',12)).toBe(s);
 for(const month of [0,769,NaN,1.5])expect(()=>rescheduleEvent(s,'pay',month)).toThrow();
 expect(()=>rescheduleEvent(s,'missing',1)).toThrow();
});
it('分支歷史鎖定、未來不能跨分支點，合法移動不影響父方案',()=>{
 const s=source();s.events.push({id:'rent',type:'rentChange',version:1,month:3,amount:1000000});
 const child=forkScenario(s,'child','分支',6),before=structuredClone(child);
 expect(()=>rescheduleEvent(child,'rent',4)).toThrow();expect(()=>rescheduleEvent(child,'pay',6)).toThrow();
 expect(child).toEqual(before);const next=rescheduleEvent(child,'pay',7);
 expect(s.events[0].month).toBe(12);expect(next.events[0].month).toBe(7);
});
it('同類同月與職涯重疊拒絕且不更動原始資料',()=>{
 const s=source();s.events.push({id:'pay2',type:'incomeChange',version:1,month:24,amount:7000000});
 expect(()=>rescheduleEvent(s,'pay',24)).toThrow();
 s.events=[{id:'a',type:'unemployment',version:1,month:2,duration:3,replacementIncome:0},{id:'b',type:'unemployment',version:1,month:8,duration:3,replacementIncome:0}];
 const before=structuredClone(s);expect(()=>rescheduleEvent(s,'b',4)).toThrow();expect(s).toEqual(before);
 const next=rescheduleEvent(s,'b',5);expect(next.events[1]).toEqual({...s.events[1],month:5});
});
it('V1 購屋亦可移動，參數與引擎版本保留',()=>{
 const s=structuredClone(initialProject.scenarios[0]);s.events=[{id:'home',type:'buyHouse',version:1,month:3,price:100000000,downPayment:0,annualRate:.025,termMonths:360}];
 const next=rescheduleEvent(s,'home',6);expect(next.engineVersion).toBe('1.0.0');expect(simulate(next,6)[5].ownsHome).toBe(false);expect(simulate(next,6)[6].ownsHome).toBe(true);
});
