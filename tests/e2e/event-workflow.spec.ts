import {test,expect,type Page} from '@playwright/test';
import {initialProject} from '../../src/domain/model';
import {migrateProject} from '../../src/domain/migration';
async function exported(page:Page){const waiting=page.waitForEvent('download');await page.getByRole('button',{name:'匯出',exact:true}).click();const stream=await(await waiting).createReadStream();if(!stream)throw Error('download');const chunks:Buffer[]=[];for await(const c of stream)chunks.push(Buffer.from(c));return JSON.parse(Buffer.concat(chunks).toString());}
async function setup(page:Page,project:unknown=migrateProject(initialProject)){
 await page.setViewportSize({width:1440,height:1000});await page.goto('/');await page.getByLabel('匯入人生存檔').setInputFiles({name:'workflow.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});await expect(page.getByRole('status')).toContainText('匯入成功');
}
test('PC 事件庫可搜尋分類，V1 限制明示，取消與焦點完整返回',async({page},testInfo)=>{
 await setup(page,initialProject);const before=await exported(page),trigger=page.getByRole('button',{name:/^瀏覽事件庫/});await trigger.click();const library=page.getByRole('dialog',{name:'人生事件庫'});
 await expect(page.getByLabel('搜尋事件')).toBeFocused();await page.screenshot({path:testInfo.outputPath('pc-event-library.png')});await page.keyboard.press('Shift+Tab');await expect(page.getByRole('button',{name:'關閉事件庫'})).toBeFocused();await page.keyboard.press('Tab');await expect(page.getByLabel('搜尋事件')).toBeFocused();
 await page.getByLabel('搜尋事件').fill('加薪');await expect(library.locator('article')).toHaveCount(1);await expect(page.getByRole('button',{name:'設定：調整正常月薪',exact:true})).toBeDisabled();await expect(library).toContainText('需先升級財務模型');
 await page.getByLabel('搜尋事件').fill('不存在的事件');await expect(library).toContainText('找不到符合');await page.getByRole('button',{name:'重設篩選'}).click();await page.getByRole('group',{name:'事件類別'}).getByRole('button',{name:'職涯',exact:true}).click();await expect(library.locator('article')).toHaveCount(2);
 await page.getByRole('button',{name:'設定：職涯暫停',exact:true}).click();await expect(page.getByRole('dialog',{name:'事件設定'})).toBeVisible();await page.keyboard.press('Escape');await expect(trigger).toBeFocused();expect(await exported(page)).toEqual(before);
});
test('PC 模板預覽與儲存後數字一致，預覽及取消不寫入',async({page},testInfo)=>{
 await setup(page);const before=await exported(page);const open=async()=>{await page.getByRole('button',{name:/^瀏覽事件庫/}).click();await page.getByLabel('搜尋事件').fill('加薪');await page.getByRole('button',{name:'設定：調整正常月薪',exact:true}).click();await page.getByLabel('發生月份').fill('12');await page.getByLabel('新的正常月薪（元）').fill('60000');};
 await open();const preview=page.getByRole('region',{name:'事件影響預覽'});await expect(preview).toContainText('$1,050,000');await expect(preview).toContainText('$7,570,000');await page.screenshot({path:testInfo.outputPath('pc-event-preview.png'),fullPage:false});await page.getByRole('button',{name:'取消',exact:true}).click();expect(await exported(page)).toEqual(before);
 await open();await expect(preview).toContainText('$1,050,000');await page.getByRole('button',{name:'儲存事件',exact:true}).click();const saved=await exported(page);expect(saved.scenarios[0].events).toHaveLength(1);expect(saved.scenarios[0].history).toHaveLength(1);
 await page.getByRole('slider').focus();await page.keyboard.press('Home');for(let i=0;i<12;i++)await page.keyboard.press('ArrowRight');await expect(page.locator('.metrics')).toContainText('$1,050,000');
});
test('編輯已有事件只替換一次，無效輸入清除舊預覽',async({page})=>{
 const project=migrateProject(initialProject);project.scenarios[0].events=[{id:'pay',type:'incomeChange',version:1,month:12,amount:6000000}];await setup(page,project);await page.getByRole('button',{name:'編輯事件',exact:true}).click();const preview=page.getByRole('region',{name:'事件影響預覽'});
 await page.getByLabel('新的正常月薪（元）').fill('70000');await expect(preview).toContainText('$1,060,000');await page.getByLabel('新的正常月薪（元）').fill('');await expect(preview).toContainText('請先填妥');await expect(preview.getByRole('table')).toHaveCount(0);
 await page.getByLabel('新的正常月薪（元）').fill('70000');await expect(preview).toContainText('$1,060,000');await page.getByRole('button',{name:'儲存事件',exact:true}).click();const saved=await exported(page);expect(saved.scenarios[0].events).toEqual([{id:'pay',type:'incomeChange',version:1,month:12,amount:7000000}]);
});
test('同月衝突預覽拒絕，草稿與分支界線仍受保護',async({page})=>{
 const project=migrateProject(initialProject);project.scenarios[0].events=[{id:'pay',type:'incomeChange',version:1,month:12,amount:6000000}];await setup(page,project);const before=await exported(page);await page.getByRole('button',{name:/^瀏覽事件庫/}).click();await page.getByRole('button',{name:'設定：調整正常月薪',exact:true}).click();await page.getByLabel('發生月份').fill('12');
 await expect(page.getByRole('region',{name:'事件影響預覽'})).toContainText('同月不可重複');await page.getByRole('button',{name:'儲存事件',exact:true}).click();await expect(page.getByRole('dialog').getByRole('alert')).toContainText('同月不可重複');await page.getByRole('button',{name:'取消',exact:true}).click();expect(await exported(page)).toEqual(before);
 await page.getByLabel('月收入（元）',{exact:true}).fill('55000');await page.getByRole('button',{name:/^瀏覽事件庫/}).click();await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('status')).toContainText('請先按');await page.getByRole('button',{name:'還原未套用資料'}).click();
 await page.getByRole('slider').focus();await page.keyboard.press('Home');for(let i=0;i<6;i++)await page.keyboard.press('ArrowRight');await page.getByRole('button',{name:'從第 6 月建立分支'}).click();await page.getByRole('button',{name:/^瀏覽事件庫/}).click();await page.getByRole('button',{name:'設定：調整月租金',exact:true}).click();await expect(page.getByLabel('發生月份')).toHaveValue('7');await expect(page.getByLabel('發生月份')).toHaveAttribute('min','7');
});
