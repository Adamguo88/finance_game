import {test,expect,type Page} from '@playwright/test';

async function upgrade(page:Page){
 await page.getByRole('button',{name:'升級財務模型',exact:true}).click();
 const dialog=page.getByRole('dialog',{name:'新版模型轉換預覽'});
 await expect(dialog.getByRole('button',{name:'確認轉換',exact:true})).toBeDisabled();
 const download=page.waitForEvent('download');
 await dialog.getByRole('button',{name:'下載原始 V1 備份'}).click();
 const file=await download;
 await dialog.getByRole('button',{name:'確認轉換',exact:true}).click();
 await expect(page.locator('.engineVersion')).toContainText('2.0.0');
 return file;
}
async function exportJson(page:Page){
 const waiting=page.waitForEvent('download');await page.getByRole('button',{name:'匯出',exact:true}).click();
 const stream=await (await waiting).createReadStream();if(!stream)throw new Error('無法讀取下載');
 const chunks:Buffer[]=[];for await(const chunk of stream)chunks.push(Buffer.from(chunk));
 return JSON.parse(Buffer.concat(chunks).toString());
}

test('顯式轉換可取消、備份完整且不自動覆蓋 IndexedDB',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto('/');await page.getByRole('button',{name:'下一月',exact:true}).click();
 await page.getByRole('button',{name:'從第 1 月建立分支'}).click();
 await page.getByRole('button',{name:'儲存',exact:true}).click();await expect(page.getByRole('status')).toContainText('已存入');
 const before=await exportJson(page);
 await page.getByRole('button',{name:'升級財務模型',exact:true}).click();
 await page.getByRole('button',{name:'取消轉換',exact:true}).click();
 await expect(page.getByRole('slider')).toHaveValue('1');expect(await exportJson(page)).toEqual(before);
 const backup=await upgrade(page),stream=await backup.createReadStream();if(!stream)throw new Error('原始備份失敗');
 const chunks:Buffer[]=[];for await(const chunk of stream)chunks.push(Buffer.from(chunk));
 expect(JSON.parse(Buffer.concat(chunks).toString())).toEqual(before);
 await expect(page.getByRole('slider')).toHaveValue('1');
 await page.getByRole('button',{name:'讀取',exact:true}).click();await expect(page.getByRole('status')).toContainText('已載入');
 await expect(page.locator('.engineVersion')).toContainText('1.0.0');
 await upgrade(page);await page.getByRole('button',{name:'儲存',exact:true}).click();await expect(page.getByRole('status')).toContainText('已存入');
 await page.reload();await page.getByRole('button',{name:'讀取',exact:true}).click();
 await expect(page.locator('.engineVersion')).toContainText('2.0.0');
 await expect(page.getByLabel('目前人生').locator('option')).toHaveCount(2);
 const roundtrip=await exportJson(page);expect(roundtrip.schemaVersion).toBe(2);
 expect(roundtrip.scenarios.map((s:{id:string})=>s.id)).toEqual(before.scenarios.map((s:{id:string})=>s.id));
 expect(roundtrip.scenarios[1].parentId).toBe(before.scenarios[1].parentId);
 expect(errors).toEqual([]);
});

test('租金、既有負債與薪資事件接入編輯和月度明細',async({page})=>{
 await page.goto('/');await upgrade(page);
 await page.getByRole('spinbutton',{name:'生活費（不含租金）（元）',exact:true}).fill('18000');
 await page.getByRole('spinbutton',{name:'月租金（元）',exact:true}).fill('12000');
 await page.getByRole('spinbutton',{name:'既有負債（元）',exact:true}).fill('120000');
 await page.getByRole('button',{name:'新增負債排程',exact:true}).click();
 await page.getByLabel('排程 1 本金（元）').fill('120000');
 await page.getByRole('button',{name:'更新基礎資料',exact:true}).click();
 await page.getByRole('button',{name:'下一月',exact:true}).click();
 await expect(page.locator('.metrics')).toContainText('$810,000');
 await expect(page.locator('.metrics')).toContainText('$110,000');
 await expect(page.locator('.ledger')).toContainText('其他負債本息 $10,000');
 await page.getByRole('button',{name:/^調整月租金/}).click();
 await page.getByLabel('發生月份').fill('2');await page.getByLabel('新的月租金（元）').fill('15000');
 await page.getByRole('button',{name:'儲存事件',exact:true}).click();
 await page.getByRole('button',{name:/^調整正常月薪/}).click();
 await page.getByLabel('發生月份').fill('3');await page.getByLabel('新的正常月薪（元）').fill('60000');
 await page.getByRole('button',{name:'儲存事件',exact:true}).click();
 await page.getByRole('button',{name:/^◷ 職涯暫停/}).click();
 await page.getByLabel('發生月份').fill('2');await page.getByLabel('失業月數').fill('2');await page.getByLabel('期間每月替代收入（元）').fill('10000');
 await page.getByRole('button',{name:'儲存事件',exact:true}).click();
 for(let month=2;month<=3;month++){
  await page.getByRole('button',{name:'下一月',exact:true}).click();
  await expect(page.locator('.ledger')).toContainText('月收入 $10,000');
  await expect(page.locator('.ledger')).toContainText('月租金 $15,000');
 }
 await page.getByRole('button',{name:'下一月',exact:true}).click();
 await expect(page.locator('.ledger')).toContainText('月收入 $60,000');
 const saved=await exportJson(page);expect(saved.scenarios[0].profile.debtSchedules).toHaveLength(1);
 expect(saved.scenarios[0].history[0].profile.rent).toBe(0);
 expect(saved.scenarios[0].profile.version).toBe(2);
 await page.getByRole('button',{name:'從第 4 月建立分支'}).click();
 await expect(page.getByLabel('月租金（元）', {exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:'編輯事件',exact:true}).first()).toBeDisabled();
});

test('同月重複事件在視窗內顯示錯誤，不破壞已安排事件',async({page})=>{
 await page.goto('/');await upgrade(page);
 for(let i=0;i<2;i++){
  await page.getByRole('button',{name:/^調整月租金/}).click();
  await page.getByLabel('發生月份').fill('2');await page.getByLabel('新的月租金（元）').fill('10000');
  await page.getByRole('button',{name:'儲存事件',exact:true}).click();
 }
 await expect(page.getByRole('dialog').getByRole('alert')).toContainText('同月不可重複');
 await page.getByRole('button',{name:'取消',exact:true}).click();
 await expect(page.getByRole('button',{name:'編輯事件',exact:true})).toHaveCount(1);
});

test('手機 V2 購屋停止租金、備份還原與過額排程保護',async({page},testInfo)=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');await upgrade(page);
 await page.getByLabel('現金（元）',{exact:true}).fill('3000000');
 await page.getByLabel('月收入（元）',{exact:true}).fill('0');
 await page.getByLabel('生活費（不含租金）（元）',{exact:true}).fill('18000');
 await page.getByLabel('月租金（元）',{exact:true}).fill('12000');
 await page.getByRole('button',{name:'更新基礎資料',exact:true}).click();
 await page.getByRole('button',{name:/^⌂ 建立自己的家/}).click();
 await page.getByLabel('年利率（%）',{exact:true}).fill('0');
 await page.getByLabel('從購屋當月停止租金（同月租金事件仍優先）').check();
 await page.getByRole('button',{name:'儲存事件',exact:true}).click();
 await page.getByRole('button',{name:'下一月',exact:true}).click();
 await expect(page.locator('.ledger')).toContainText('月租金 $0');
 await expect(page.locator('.metrics')).toContainText('$959,777.78');
 await page.screenshot({path:testInfo.outputPath('v02-mobile.png'),fullPage:true});
 const before=await exportJson(page);
 await page.getByRole('button',{name:'新增負債排程',exact:true}).click();
 await page.getByLabel('排程 1 本金（元）').fill('100');
 await page.getByRole('button',{name:'更新基礎資料',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('不可超過既有負債');
 expect(await exportJson(page)).toEqual(before);
 await page.getByLabel('匯入人生存檔').setInputFiles({name:'v2.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(before))});
 await expect(page.getByRole('status')).toContainText('匯入成功');
 await expect(page.getByRole('button',{name:'移除排程 1',exact:true})).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('混合版本比較顯示各自引擎，短方案取消勾選後共用月份可繼續',async({page})=>{
 const {initialProject}=await import('../../src/domain/model');
 const {migrateProject}=await import('../../src/domain/migration');
 const old=structuredClone(initialProject.scenarios[0]);old.profile.age=89;
 const newer=migrateProject(initialProject).scenarios[0];newer.id='v2';newer.name='新版人生';newer.profile.age=88;
 const project={schemaVersion:2,scenarios:[old,newer],migration:null};
 await page.goto('/');
 await page.getByLabel('匯入人生存檔').setInputFiles({name:'mixed.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});
 await page.getByRole('button',{name:'平行人生',exact:true}).click();
 await expect(page.locator('.comparisons article').nth(0)).toContainText('引擎 1.0.0');
 await expect(page.locator('.comparisons article').nth(1)).toContainText('引擎 2.0.0');
 await expect(page.getByRole('slider')).toHaveAttribute('max','12');
 await page.getByRole('checkbox',{name:'我的人生',exact:true}).uncheck();
 await page.getByRole('slider').focus();await page.keyboard.press('End');
 await expect(page.getByRole('slider')).toHaveValue('24');
 await expect(page.locator('.intro .age')).toContainText('24');
 await expect(page.locator('.intro .age')).toContainText('共同時間位置');
 await expect(page.locator('.comparisons article')).toContainText('第 24 月 · 90 歲');
});

test('損壞的 V2 參數與歷史匯入不取代工作',async({page})=>{
 await page.goto('/');await upgrade(page);
 await page.getByRole('button',{name:'下一月',exact:true}).click();
 const before=await exportJson(page);
 const badProfile=structuredClone(before);badProfile.scenarios[0].profile.debtSchedules=[{id:'bad',openingBalance:1,annualRate:0,firstPaymentMonth:1,termMonths:1}];
 const badHistory=structuredClone(before);badHistory.scenarios[0].history=[{revision:1,profile:{...badHistory.scenarios[0].profile,rent:-1},events:[]}];
 const unknown=structuredClone(before);unknown.scenarios[0].engineVersion='9.0.0';
 for(const invalid of [badProfile,badHistory,unknown]){
  await page.getByLabel('匯入人生存檔').setInputFiles({name:'invalid-v2.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(invalid))});
  await expect(page.getByRole('status')).toContainText('匯入失敗');
  await expect(page.getByRole('slider')).toHaveValue('1');
  expect(await exportJson(page)).toEqual(before);
 }
});

test('升級與 V2 事件視窗 Escape 後恢復觸發按鈕焦點',async({page})=>{
 await page.goto('/');
 const trigger=page.getByRole('button',{name:'升級財務模型',exact:true});
 await trigger.click();
 await expect(page.getByRole('button',{name:'下載原始 V1 備份'})).toBeFocused();
 await page.keyboard.press('Shift+Tab');
 await expect(page.getByRole('button',{name:'取消轉換',exact:true})).toBeFocused();
 await page.keyboard.press('Escape');
 await expect(trigger).toBeFocused();
 await upgrade(page);
 const rent=page.getByRole('button',{name:/^調整月租金/});await rent.click();
 await expect(page.getByLabel('發生月份')).toBeFocused();await page.keyboard.press('Escape');
 await expect(rent).toBeFocused();
});

test('存檔等待期間阻止編輯，解除阻塞後恢復互動',async({page})=>{
 await page.goto('/');
 await page.evaluate(async()=>{
  await new Promise<void>((resolve,reject)=>{
   const request=indexedDB.open('life-studio',1);
   request.onerror=()=>reject(request.error);
   request.onsuccess=()=>{(window as unknown as {blockedDb:IDBDatabase}).blockedDb=request.result;resolve();};
  });
 });
 await page.getByRole('button',{name:'儲存',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('正在處理存檔');
 await expect(page.getByRole('button',{name:'下一月',exact:true}).click({timeout:300})).rejects.toThrow();
 await page.evaluate(()=>(window as unknown as {blockedDb:IDBDatabase}).blockedDb.close());
 await expect(page.getByRole('status')).toContainText('已存入');
 await expect(page.getByRole('slider')).toHaveValue('0');
 await page.getByRole('button',{name:'下一月',exact:true}).click();
 await expect(page.getByRole('slider')).toHaveValue('1');
});
