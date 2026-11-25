import {it,expect} from 'vitest';
import {initialProject} from '../src/domain/model';
import {migrateProject} from '../src/domain/migration';
import {forkScenario} from '../src/domain/scenarios';
import {previewEvent} from '../src/domain/event-preview';
const source=()=>migrateProject(initialProject).scenarios[0];
it('薪資預覽按同月比較並保留原方案/歷史，終點差額精確',()=>{
 const s=source(),before=structuredClone(s);const rows=previewEvent(s,{id:'',type:'incomeChange',version:1,month:12,amount:6000000});
 expect(rows[0].before.cash).toBe(104000000);expect(rows[0].after.cash).toBe(105000000);
 expect(rows[1].after.netWorth-rows[1].before.netWorth).toBe(757000000);expect(s).toEqual(before);
});
it('已存在事件用 ID 替換，未知 ID 拒絕',()=>{
 const s=source();s.events=[{id:'pay',type:'incomeChange',version:1,month:12,amount:6000000}];
 const rows=previewEvent(s,{id:'pay',type:'incomeChange',version:1,month:12,amount:7000000});expect(rows[0].after.cash-rows[0].before.cash).toBe(1000000);
 expect(()=>previewEvent(s,{...s.events[0],id:'missing'})).toThrow();
});
it('預覽尊重分支鎖定、重複同月與原格式限制',()=>{
 const s=source();s.events=[{id:'rent',type:'rentChange',version:1,month:2,amount:1000000}];
 const child=forkScenario(s,'c','child',6),before=structuredClone(child);
 expect(()=>previewEvent(child,{...s.events[0],month:3})).toThrow();
 expect(()=>previewEvent(s,{...s.events[0],id:''})).toThrow();expect(child).toEqual(before);
 expect(()=>previewEvent(initialProject.scenarios[0],{id:'',type:'rentChange',version:1,month:3,amount:100})).toThrow();
});
it('V1 購屋/失業仍由原引擎計算，終點月份不重複',()=>{
 const s=structuredClone(initialProject.scenarios[0]);s.profile.cash=300000000;s.profile.income=0;s.profile.expenses=0;
 const rows=previewEvent(s,{id:'',type:'buyHouse',version:1,month:1,price:1000000000,downPayment:200000000,annualRate:0,termMonths:360});
 expect(rows[0].after.cash).toBe(97777778);expect(rows[0].after.netWorth).toBe(rows[0].before.netWorth);
 expect(previewEvent(s,{id:'',type:'unemployment',version:1,month:768,duration:2,replacementIncome:100}) ).toHaveLength(1);
});
it('新草稿臨時 ID 不會覆蓋已有同名事件，無效參數不改資料',()=>{
 const s=source();s.events=[{id:'__event_preview__',type:'rentChange',version:1,month:2,amount:1000000}];const before=structuredClone(s);
 const rows=previewEvent(s,{id:'',type:'incomeChange',version:1,month:3,amount:6000000});expect(rows[0].after.expenses).toBe(4000000);
 expect(()=>previewEvent(s,{id:'',type:'incomeChange',version:1,month:3,amount:-1})).toThrow();expect(s).toEqual(before);
});

import {createEventDraft,unavailableReason} from '../src/app/events/catalog';
it('模板有版本/購屋限制且使用分支的合法未來月份，不改來源',()=>{
 const old=initialProject.scenarios[0];expect(()=>createEventDraft('incomeChange',old,0)).toThrow();
 expect(createEventDraft('buyHouse',old,0)).toMatchObject({version:1,month:1});
 const s=source(),child=forkScenario(s,'child','child',6);expect(createEventDraft('incomeChange',child,0)).toMatchObject({version:1,month:7,amount:5000000});
 const home=createEventDraft('buyHouse',s,0);s.events=[{...home,id:'home'} as typeof s.events[number]];expect(unavailableReason('buyHouse',s)).toContain('已有購屋');
});
it('模板事件數量上限涵蓋所有種類，不產生未保存的事件',()=>{
 const s=source();s.events=Array.from({length:100},(_,i)=>({id:String(i),type:'incomeChange',version:1,month:i+1,amount:5000000}));
 const before=structuredClone(s);for(const type of ['buyHouse','unemployment','rentChange','incomeChange'] as const)expect(()=>createEventDraft(type,s,0)).toThrow('100');expect(s).toEqual(before);
});
