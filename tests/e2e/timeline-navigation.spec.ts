import {test,expect,type Page} from '@playwright/test';
import {initialProject,type LifeEventV2} from '../../src/domain/model';
import {migrateProject} from '../../src/domain/migration';
import {createLifeProject} from '../../src/domain/setup';
async function backup(page:Page){const waiting=page.waitForEvent('download');await page.getByRole('button',{name:'匯出',exact:true}).click();const stream=await(await waiting).createReadStream();const chunks:Buffer[]=[];for await(const c of stream!)chunks.push(Buffer.from(c));return JSON.parse(Buffer.concat(chunks).toString());}
async function enter(page:Page,project:unknown){await page.goto('/');await page.getByRole('button',{name:'探索範例人生',exact:true}).click();await page.getByLabel('匯入人生存檔').setInputFiles({name:'navigation.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});await expect(page.getByRole('status')).toContainText('匯入成功');}
async function seek(page:Page,month:string){await page.getByLabel('跳至第幾月',{exact:true}).fill(month);await page.getByRole('button',{name:'跳轉月份',exact:true}).click();}
function sample(){const p=migrateProject(initialProject);p.scenarios[0].events=[{id:'s',type:'incomeChange',version:1,month:12,amount:6000000},{id:'s2',type:'incomeChange',version:1,month:13,amount:7000000},{id:'rent',type:'rentChange',version:1,month:2,amount:1000000}];return p;}
test('縮放與定位不寫資料，指定月份與錯誤輸入保留精確共同時間',async({page})=>{
 await page.setViewportSize({width:1440,height:900});const p=sample();await enter(page,p);await seek(page,'360');await expect(page.getByRole('slider')).toHaveValue('360');
 for(const scale of ['month','life','year']){await page.getByLabel('時間軸縮放').selectOption(scale);await expect(page.locator('.trackCanvas')).toHaveAttribute('data-scale',scale);await expect(page.getByRole('slider')).toHaveValue('360');}
 await page.getByRole('button',{name:'定位目前月',exact:true}).click();const pos=await page.locator('.trackScroll').evaluate(el=>{const marker=el.querySelector('.trackPlayhead')!.getBoundingClientRect(),box=el.getBoundingClientRect();return marker.left>=box.left&&marker.left<=box.right;});expect(pos).toBe(true);
 await seek(page,'769');await expect(page.locator('.eventTimeline').getByRole('alert')).toContainText('0–768');await expect(page.getByRole('slider')).toHaveValue('360');await seek(page,'1.5');await expect(page.locator('.eventTimeline').getByRole('alert')).toContainText('整數');await seek(page,'0');await expect(page.getByRole('slider')).toHaveValue('0');expect(await backup(page)).toEqual(p);
});
test('合法 20 方案各 100 事件、864 月可縮放尋找，密集卡片獨立可讀且保留焦點',async({page},info)=>{
 const p=createLifeProject('人生 0',{...migrateProject(initialProject).scenarios[0].profile,age:18},'p0');
 const events:LifeEventV2[]=[...Array.from({length:97},(_,i)=>({id:'s'+i,type:'incomeChange' as const,version:1 as const,month:i+1,amount:5000000+i*10000})),{id:'rent',type:'rentChange',version:1,month:98,amount:1000000},{id:'rest1',type:'unemployment',version:1,month:320,duration:60,replacementIncome:0},{id:'rest2',type:'unemployment',version:1,month:720,duration:120,replacementIncome:0}];
 const base=p.scenarios[0];if(base.engineVersion!=='2.0.0')throw Error('V2 required');
 p.scenarios=Array.from({length:20},(_,i)=>({...structuredClone(base),id:'p'+i,name:'人生 '+i,profile:{...base.profile,id:'p'+i+'-profile'},events:structuredClone(events)}));
 await page.setViewportSize({width:1440,height:900});const start=Date.now();await enter(page,p);await expect(page.locator('.trackCard')).toHaveCount(100);console.log('100 events / 20 plans import and first timeline:',Date.now()-start,'ms');
 await page.getByLabel('時間軸縮放').selectOption('life');const overlap=await page.locator('.trackCard').evaluateAll(nodes=>{const r=nodes.map(n=>n.getBoundingClientRect());return r.some((a,i)=>r.some((b,j)=>i<j&&a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom));});expect(overlap).toBe(false);
 await page.getByLabel('尋找時間軸事件').selectOption('s0');await expect(page.locator('[data-event-id="s0"]')).toBeFocused();await page.keyboard.press('End');await expect(page.locator('[data-event-id="s96"]')).toBeFocused();await page.keyboard.press('ArrowUp');await expect(page.locator('[data-event-id="s95"]')).toBeFocused();await page.keyboard.press('ArrowDown');await expect(page.locator('[data-event-id="s96"]')).toBeFocused();await expect(page.getByRole('slider')).toHaveValue('0');
 await page.getByLabel('目前人生',{exact:true}).selectOption('p19');await expect(page.locator('.trackCard')).toHaveCount(100);await seek(page,'864');await expect(page.getByRole('slider')).toHaveValue('864');await page.getByLabel('時間軸縮放').selectOption('life');await page.locator('.eventTimeline').screenshot({path:info.outputPath('pc-100-events-timeline.png')});expect(await backup(page)).toEqual(p);
});
test('月份詳覽保留衝突與分支鎖定；拖曳只提交一次，Escape 取消不改歷史',async({page})=>{
 const p=sample();await enter(page,p);await page.getByLabel('時間軸縮放').selectOption('month');await page.getByLabel('尋找時間軸事件').selectOption('s');await page.keyboard.press('ArrowRight');await expect(page.getByRole('status')).toContainText('同月不可重複');expect(await backup(page)).toEqual(p);
 await seek(page,'6');await page.getByRole('button',{name:'從第 6 月建立分支'}).click();await page.getByLabel('時間軸縮放').selectOption('month');const before=await backup(page);await page.getByLabel('尋找時間軸事件').selectOption('rent');await page.keyboard.press('ArrowRight');expect(await backup(page)).toEqual(before);
 await page.getByLabel('尋找時間軸事件').selectOption('s2');const card=page.locator('[data-event-id="s2"]');let box=await card.boundingBox();if(!box)throw Error('card');await page.mouse.move(box.x+80,box.y+25);await page.mouse.down();await page.mouse.move(box.x+176,box.y+25,{steps:5});await page.mouse.up();await expect(card).toHaveAccessibleName('時間軸：調整正常月薪，第 15 月');const moved=await backup(page);expect(moved.scenarios[1].history).toHaveLength(1);
 await page.getByLabel('尋找時間軸事件').selectOption('s2');box=await card.boundingBox();if(!box)throw Error('card');await page.mouse.move(box.x+80,box.y+25);await page.mouse.down();await page.mouse.move(box.x+128,box.y+25,{steps:3});await page.keyboard.press('Escape');await page.mouse.up();expect(await backup(page)).toEqual(moved);
});
test('鍵盤跨越相鄰卡片改期後仍保留同一張焦點，回移亦只新增一次歷史',async({page})=>{
 const p=sample();await enter(page,p);await page.getByLabel('時間軸縮放').selectOption('month');await page.getByLabel('尋找時間軸事件').selectOption('s');const card=page.locator('[data-event-id="s"]');
 await page.keyboard.press('Shift+ArrowRight');await expect(card).toHaveAccessibleName('時間軸：調整正常月薪，第 24 月');await expect(card).toBeFocused();const next=await backup(page);expect(next.scenarios[0].history).toHaveLength(1);
 await page.getByLabel('尋找時間軸事件').selectOption('s');await page.keyboard.press('Shift+ArrowLeft');await expect(card).toBeFocused();await expect(card).toHaveAccessibleName('時間軸：調整正常月薪，第 12 月');const back=await backup(page);expect(back.scenarios[0].events).toEqual(p.scenarios[0].events);expect(back.scenarios[0].history).toHaveLength(2);
});
test('長短人生比較的精確跳月遵守共同上限，不靜默截短輸入',async({page})=>{
 const p=createLifeProject('長人生',{...migrateProject(initialProject).scenarios[0].profile,age:18},'long'),base=p.scenarios[0];if(base.engineVersion!=='2.0.0')throw Error('V2 required');p.scenarios.push({...structuredClone(base),id:'short',name:'短人生',profile:{...base.profile,id:'short-profile',age:89}});
 await enter(page,p);await page.getByRole('button',{name:'平行人生',exact:true}).click();await seek(page,'13');await expect(page.locator('.eventTimeline').getByRole('alert')).toContainText('0–12');await expect(page.getByRole('slider')).toHaveValue('0');await seek(page,'12');await expect(page.getByRole('slider')).toHaveValue('12');expect(await backup(page)).toEqual(p);
});
