import {test,expect,type Page} from '@playwright/test';
import {initialProject} from '../../src/domain/model';
import {migrateProject} from '../../src/domain/migration';
async function setup(page:Page){
 const project=migrateProject(initialProject);project.scenarios[0].events=[{id:'salary',type:'incomeChange',version:1,month:12,amount:6000000},{id:'rent',type:'rentChange',version:1,month:2,amount:1000000}];
 await page.goto('/');await page.getByLabel('匯入人生存檔').setInputFiles({name:'tracks.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});await expect(page.getByRole('status')).toContainText('匯入成功');return project;
}
async function exported(page:Page){
 const waiting=page.waitForEvent('download');await page.getByRole('button',{name:'匯出',exact:true}).click();const stream=await(await waiting).createReadStream();if(!stream)throw Error('download');const chunks:Buffer[]=[];for await(const c of stream)chunks.push(Buffer.from(c));return JSON.parse(Buffer.concat(chunks).toString());
}
test('鍵盤重排薪資可回溯財務、保留參數與歷史，存檔可還原',async({page})=>{
 const project=await setup(page),card=page.locator('[data-event-id="salary"]');
 await card.focus();await page.keyboard.press('ArrowRight');await expect(card).toHaveAccessibleName('時間軸：調整正常月薪，第 13 月');
 const next=await exported(page);expect(next.scenarios[0].events[0]).toEqual({...project.scenarios[0].events[0],month:13});expect(next.scenarios[0].history).toHaveLength(1);
 await page.getByRole('slider').focus();await page.keyboard.press('Home');for(let i=0;i<12;i++)await page.keyboard.press('ArrowRight');
 await expect(page.locator('.ledger')).toContainText('月收入 $50,000');await page.keyboard.press('ArrowRight');await expect(page.locator('.ledger')).toContainText('月收入 $60,000');
 await page.getByRole('button',{name:'儲存',exact:true}).click();await expect(page.getByRole('status')).toContainText('已存入');await page.reload();await page.getByRole('button',{name:'讀取',exact:true}).click();await expect(card).toHaveAccessibleName('時間軸：調整正常月薪，第 13 月');
});
test('拖曳吸附月份只提交一次，Escape 取消不改方案',async({page})=>{
 await setup(page);const card=page.locator('[data-event-id="salary"]');await card.scrollIntoViewIfNeeded();let box=await card.boundingBox();if(!box)throw Error('card');
 await page.mouse.move(box.x+40,box.y+25);await page.mouse.down();await page.mouse.move(box.x+72,box.y+25,{steps:5});await expect(card).toHaveAccessibleName('時間軸：調整正常月薪，第 14 月');await page.mouse.up();await expect(page.getByRole('dialog')).toHaveCount(0);
 const moved=await exported(page);expect(moved.scenarios[0].events[0].month).toBe(14);expect(moved.scenarios[0].history).toHaveLength(1);
 await card.scrollIntoViewIfNeeded();box=await card.boundingBox();if(!box)throw Error('card');await page.mouse.move(box.x+40,box.y+25);await page.mouse.down();await page.mouse.move(box.x+88,box.y+25,{steps:3});await page.keyboard.press('Escape');await page.mouse.up();
 expect(await exported(page)).toEqual(moved);
});
test('非法同月重排與鎖定不修改資料，未來事件不能跨越分支點',async({page})=>{
 const project=await setup(page);project.scenarios[0].events.push({id:'salary2',type:'incomeChange',version:1,month:13,amount:7000000});
 await page.getByLabel('匯入人生存檔').setInputFiles({name:'collision.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});await expect(page.getByRole('status')).toContainText('匯入成功');
 const card=page.locator('[data-event-id="salary"]');await card.focus();await page.keyboard.press('ArrowRight');await expect(page.getByRole('status')).toContainText('同月不可重複');expect(await exported(page)).toEqual(project);
 await page.getByRole('slider').focus();await page.keyboard.press('Home');for(let i=0;i<6;i++)await page.keyboard.press('ArrowRight');await page.getByRole('button',{name:'從第 6 月建立分支'}).click();
 const before=await exported(page);await page.locator('[data-event-id="rent"]').focus();await page.keyboard.press('ArrowRight');expect(await exported(page)).toEqual(before);
 await card.focus();await page.keyboard.press('Shift+ArrowLeft');await expect(page.getByRole('status')).toContainText('事件月份超出');expect(await exported(page)).toEqual(before);
});
test('體驗模式只定位、未套用草稿阻止重排，手機時間軸在區塊內捲動',async({page},testInfo)=>{
 await page.setViewportSize({width:390,height:844});await setup(page);const card=page.locator('[data-event-id="salary"]');
 await page.getByLabel('月收入（元）',{exact:true}).fill('55000');await card.focus();await page.keyboard.press('ArrowRight');await expect(page.getByRole('status')).toContainText('請先按');await expect(card).toHaveAccessibleName('時間軸：調整正常月薪，第 12 月');await page.getByRole('button',{name:'還原未套用資料'}).click();
 await page.getByRole('button',{name:'體驗',exact:true}).click();const before=await exported(page);await card.click();await expect(page.getByRole('slider')).toHaveValue('12');await page.keyboard.press('ArrowRight');expect(await exported(page)).toEqual(before);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const region=page.getByLabel('事件軌道捲動區',{exact:true});expect(await region.evaluate(el=>el.scrollWidth>el.clientWidth)).toBe(true);await page.getByRole('button',{name:'定位目前月'}).click();await region.scrollIntoViewIfNeeded();await page.screenshot({path:testInfo.outputPath('timeline-mobile.png'),fullPage:true});
});
