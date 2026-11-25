import { describe,it,expect } from 'vitest';
import { initialProject, type Scenario } from '../src/domain/model';
import { payment,simulate } from '../src/domain/engine';
import { changeEvents,changeProfile,forkScenario,parseProject,replaceScenario,compareAt } from '../src/domain/scenarios';
const base=()=>structuredClone(initialProject.scenarios[0]);
const house={id:'house',version:1 as const,type:'buyHouse' as const,month:1,price:1000000000,downPayment:200000000,annualRate:0,termMonths:360};
describe('財務核心',()=>{
 it('12 個月現金流與淨資產',()=>{const s=simulate(base(),12);expect(s).toHaveLength(13);expect(s[12].cash).toBe(104000000);expect(s[12].netWorth).toBe(124000000);});
 it('購屋資產轉換及零利率房貸',()=>{const p=base();p.profile.cash=300000000;p.profile.income=0;p.profile.expenses=0;p.events=[house];const s=simulate(p,1)[1];expect(s.payment).toBe(2222222);expect(s.cash).toBe(97777778);expect(s.debt).toBe(797777778);expect(s.netWorth).toBe(320000000);});
 it('房貸本息及最末期結清',()=>{expect(payment(800000000,.025,360)).toBe(3160967);const p=base();p.events=[{...house,annualRate:.025}];const r=simulate(p,361);expect(r[360].debt).toBe(0);expect(r[361].payment).toBe(0);expect(r[1].netWorth).toBe(p.profile.cash+p.profile.assets+2000000-r[1].interest);});
 it('失業起訖與回復原薪',()=>{const p=base();p.events=[{id:'job',version:1,type:'unemployment',month:2,duration:2,replacementIncome:1000000}];const r=simulate(p,4);expect(r.map(s=>s.income)).toEqual([0,5000000,1000000,1000000,5000000]);expect(r[3].employed).toBe(false);expect(r[4].employed).toBe(true);});
 it('缺口不自動借貸',()=>{const p=base();p.profile.cash=0;p.profile.income=0;expect(simulate(p,1)[1]).toMatchObject({cash:-3000000,debt:0,gap:true});});
 it('拒絕重疊、無效與重複事件',()=>{const p=base();p.events=[house,{...house,id:'second'}];expect(()=>simulate(p,1)).toThrow();p.events=[{...house,downPayment:house.price+1}];expect(()=>simulate(p,1)).toThrow();expect(()=>payment(1,NaN,12)).toThrow();});
 it('輸入不變與重播決定性',()=>{const p=base();p.events=[house];const before=JSON.stringify(p);expect(simulate(p,24)).toEqual(simulate(p,24));expect(JSON.stringify(p)).toBe(before);});
});
describe('分支不變性',()=>{
 it('深拷貝、鎖定歷史、分支前快照一致',()=>{const p=base();p.events=[{...house,month:12}];const before=JSON.stringify(p);let b=forkScenario(p,'b','另一種選擇',6);b=changeEvents(b,[{...house,month:18}]);expect(simulate(p,6)).toEqual(simulate(b,6));expect(JSON.stringify(p)).toBe(before);b.profile.cash=1;expect(p.profile.cash).toBe(80000000);});
 it('不可修改分支前的事件與初始條件',()=>{const p=base();p.events=[house];const b=forkScenario(p,'b','B',6);expect(()=>changeEvents(b,[])).toThrow();expect(()=>changeProfile(b,b.profile)).toThrow();});
 it('來源修改不傳播到既有子分支',()=>{const p=base();const b=forkScenario(p,'b','B',6);const project={...initialProject,scenarios:[p,b]};const out=replaceScenario(project,changeProfile(p,{...p.profile,income:6000000}));expect(out.scenarios[1]).toEqual(b);});
 it('同時間比較、完整存檔還原與未知版本拒絕',()=>{const p=base(),b=forkScenario(p,'b','B',0);const project={...initialProject,scenarios:[p,b]};expect(parseProject(JSON.parse(JSON.stringify(project)))).toEqual(project);expect(compareAt([p,b],12).map(x=>x.snapshot.month)).toEqual([12,12]);expect(()=>parseProject({...project,schemaVersion:2})).toThrow();});
});

describe('版本與邊界',()=>{
 it('修改保留之前的完整參數',()=>{const p=base();const a=changeEvents(p,[house]);const b=changeProfile(a,{...a.profile,income:6000000});expect(b.revision).toBe(3);expect(b.profile.version).toBe(2);expect(b.history).toHaveLength(2);expect(b.history[0].events).toEqual([]);expect(b.history[1].profile.income).toBe(5000000);expect(b.history[1].events).toEqual([house]);});
 it('同月事件順序不影響快照',()=>{const p=base();const job={id:'job',version:1 as const,type:'unemployment' as const,month:1,duration:6,replacementIncome:0};p.events=[house,job];const q={...p,events:[job,house]};expect(simulate(p,12)).toEqual(simulate(q,12));});
 it('跨分支點失業仍繼續且不可修改',()=>{const p=base();const job={id:'job',version:1 as const,type:'unemployment' as const,month:1,duration:6,replacementIncome:0};p.events=[job];const b=forkScenario(p,'b','B',3);expect(simulate(b,6)).toEqual(simulate(p,6));expect(()=>changeEvents(b,[{...job,duration:4}])).toThrow();});
 it('重疊失業被拒絕，相接期間允許',()=>{const p=base();const job={id:'a',version:1 as const,type:'unemployment' as const,month:1,duration:2,replacementIncome:0};p.events=[job,{...job,id:'b',month:2}];expect(()=>simulate(p,4)).toThrow();p.events[1].month=3;expect(()=>simulate(p,4)).not.toThrow();});
 it('18 歲可安排至第 864 月',()=>{const p=base();p.profile.age=18;p.events=[{id:'last',version:1,type:'unemployment',month:864,duration:1,replacementIncome:0}];expect(simulate(p)[864].employed).toBe(false);});
 it('非法分支、重複 ID 與缺失父方案拒絕',()=>{const p=base();expect(()=>parseProject({...initialProject,scenarios:[p,p]})).toThrow();const b=forkScenario(p,'b','B',0);expect(()=>parseProject({...initialProject,scenarios:[b]})).toThrow();expect(()=>forkScenario(p,'x','X',768)).toThrow();});
});
