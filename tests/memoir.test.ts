import {it,expect} from 'vitest';
import {initialProject} from '../src/domain/model';
import {createLifeProject} from '../src/domain/setup';
import {migrateProject} from '../src/domain/migration';
import {forkScenario,changeEvents} from '../src/domain/scenarios';
import {buildMemoir} from '../src/app/memoir';
const source=()=>createLifeProject('主方案',{...migrateProject(initialProject).scenarios[0].profile,cash:0,income:0,expenses:1000000,rent:0},'root').scenarios[0];
it('固定資料摘要決定性、時間排序與來源不變，未來/缺口只讀取快照',()=>{
 const s=source();s.events=[{id:'income',type:'incomeChange',version:1,month:3,amount:10000000}];const before=structuredClone(s),memoir=buildMemoir(s,2,null);expect(buildMemoir(s,2,null)).toEqual(memoir);expect(s).toEqual(before);expect(memoir.entries.map(e=>e.month)).toEqual([0,1,3,3,768]);expect(memoir.entries.find(e=>e.id==='gap:1')).toMatchObject({future:false,snapshot:{cash:-1000000,debt:0}});expect(memoir.entries.find(e=>e.id==='event:income')).toMatchObject({future:true,month:3});expect(memoir.entries.find(e=>e.id==='gap:3')?.title).toBe('現金回到非負餘額');
});
it('無事件只產生來源起點/快照標記/模型終點，V1/V2 不混用購屋租金語意',()=>{
 const empty=source();expect(buildMemoir(empty,0,null).entries.filter(e=>e.kind==='event')).toEqual([]);
 const v1=structuredClone(initialProject.scenarios[0]);v1.events=[{id:'home',type:'buyHouse',version:1,month:1,price:1000000000,downPayment:0,annualRate:0,termMonths:360}];const first=buildMemoir(v1,0,null);expect(first.entries.find(e=>e.kind==='event')?.description).toContain('V1 支出維持既有定義');
 const v2=migrateProject({...structuredClone(initialProject),scenarios:[v1]}).scenarios[0];const second=buildMemoir(v2,0,null);expect(second.entries.find(e=>e.kind==='event')?.description).toContain('未選擇停租');expect(second.engineVersion).toBe('2.0.0');
});
it('分支月結束在同月事件/快照之後，承接鎖定正確且不讀父人生後續財務',()=>{
 const parent=source();parent.events=[{id:'rent',type:'rentChange',version:1,month:2,amount:1000000},{id:'income',type:'incomeChange',version:1,month:3,amount:5000000}];const child=forkScenario(parent,'child','另一種可能',2),before=structuredClone(child),memoir=buildMemoir(child,4,parent.name);expect(memoir.entries.find(e=>e.id==='event:rent')?.locked).toBe(true);expect(memoir.entries.find(e=>e.id==='event:income')?.locked).toBe(false);expect(memoir.entries.filter(e=>e.month===2).at(-1)?.kind).toBe('branch');
 const changed=changeEvents(parent,parent.events.filter(e=>e.id!=='income'));expect(changed.events).toHaveLength(1);expect(buildMemoir(child,4,changed.name)).toEqual(memoir);expect(child).toEqual(before);
});
it('未來事件修改重建摘要而不改 history，短方案清楚以自身期間截止',()=>{
 const s=source();s.events=[{id:'income',type:'incomeChange',version:1,month:3,amount:5000000}];const next=changeEvents(s,s.events.map(e=>({...e,month:4}))),before=structuredClone(next);expect(buildMemoir(next,2,null).entries.find(e=>e.id==='event:income')?.month).toBe(4);expect(next).toEqual(before);expect(next.history).toHaveLength(1);expect(s.events[0].month).toBe(3);
 const short=source();short.profile.age=89;const summary=buildMemoir(short,100,null);expect(summary.through).toBe(12);expect(summary.entries.at(-1)?.month).toBe(12);
});
