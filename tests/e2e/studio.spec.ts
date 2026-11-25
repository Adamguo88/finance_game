import { test,expect } from '@playwright/test';
test('買房、失業、分支比較與存檔',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
 await page.goto('/');await page.getByRole('button',{name:'探索範例人生',exact:true}).click();
 await page.getByRole('button',{name:'⌂ 建立自己的家'}).click();
 await page.getByRole('button',{name:'儲存事件',exact:true}).click();
 await expect(page.getByRole('button',{name:'編輯事件'})).toHaveCount(1);
 await page.getByRole('button',{name:'◷ 職涯暫停'}).click();
 await page.getByLabel('發生月份').fill('3');
 await page.getByRole('button',{name:'儲存事件',exact:true}).click();
 await page.getByRole('button',{name:'下一月',exact:true}).click();
 await expect(page.locator('svg[role=img]')).toHaveAttribute('aria-label',/自己的家/);
 await page.getByRole('button',{name:'從第 1 月建立分支'}).click();
 await expect(page.getByLabel('目前人生')).toHaveValue(/.+/);
 await expect(page.getByRole('button',{name:'編輯事件'}).first()).toBeDisabled();
 await page.getByRole('button',{name:'編輯事件'}).nth(1).click();
 await page.getByLabel('失業月數').fill('12');
 await page.getByRole('button',{name:'儲存事件',exact:true}).click();
 await page.getByRole('button',{name:'平行人生',exact:true}).click();
 await expect(page.locator('svg[role=img]')).toHaveCount(2);
 await page.getByRole('button',{name:'下一月',exact:true}).click();
 await expect(page.locator('.comparisons article').first()).toContainText('第 2 月');
 await expect(page.locator('.comparisons article').nth(1)).toContainText('第 2 月');
 await page.getByRole('button',{name:'體驗',exact:true}).click();
 await page.getByRole('button',{name:'播放',exact:true}).click();
 await expect(page.locator('.timeline')).toContainText('正在體驗');
 await page.getByRole('button',{name:'暫停',exact:true}).click();
 await page.getByRole('button',{name:'儲存',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('已存入');
 await page.reload();
 await expect(page.getByLabel('目前人生').locator('option')).toHaveCount(1);
 await page.getByRole('button',{name:'讀取',exact:true}).click();
 await expect(page.getByLabel('目前人生').locator('option')).toHaveCount(2);
 const downloadPromise=page.waitForEvent('download');
 await page.getByRole('button',{name:'匯出',exact:true}).click();
 const download=await downloadPromise;
 const path=await download.path();
 if(!path)throw new Error('下載失敗');
 await page.getByLabel('匯入人生存檔').setInputFiles(path);
 await expect(page.getByRole('status')).toContainText('匯入成功');
 await page.getByLabel('匯入人生存檔').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{"schemaVersion":99}')});
 await expect(page.getByRole('status')).toContainText('匯入失敗');
 await expect(page.getByLabel('目前人生').locator('option')).toHaveCount(2);
 expect(errors).toEqual([]);
});
test('手機版沒有水平溢出',async({page})=>{await page.setViewportSize({width:390,height:844});await page.goto('/');await page.getByRole('button',{name:'探索範例人生',exact:true}).click();await expect(page.getByRole('button',{name:'儲存',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);});

test('比較採最短期間並在終點暫停，切換模式保留月份',async({page})=>{
 const {initialProject}=await import('../../src/domain/model');
 const p=structuredClone(initialProject);p.scenarios[0].profile.age=88;
 p.scenarios.push({...structuredClone(p.scenarios[0]),id:'short',name:'短期間',profile:{...p.scenarios[0].profile,age:89}});
 await page.goto('/');await page.getByRole('button',{name:'探索範例人生',exact:true}).click();
 await page.getByLabel('匯入人生存檔').setInputFiles({name:'short.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(p))});
 await page.getByRole('button',{name:'平行人生',exact:true}).click();
 const slider=page.getByRole('slider',{name:'人生時間軸'});
 await expect(slider).toHaveAttribute('max','12');
 await slider.focus();await slider.press('End');await slider.press('ArrowLeft');
 await expect(slider).toHaveValue('11');
 await page.getByLabel('播放速度').selectOption('12');
 await page.getByRole('button',{name:'播放',exact:true}).click();
 await expect(slider).toHaveValue('12');
 await expect(page.locator('.timeline')).toContainText('時間已暫停');
 await expect(page.locator('.comparisons article').first()).toContainText('第 12 月');
 await expect(page.locator('.comparisons article').nth(1)).toContainText('第 12 月');
 await page.getByRole('button',{name:'編輯',exact:true}).click();
 await expect(slider).toHaveValue('12');
});

test('事件設定支援鍵盤循環與 Escape 返回',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'探索範例人生',exact:true}).click();
 const trigger=page.getByRole('button',{name:'◷ 職涯暫停'});
 await trigger.click();
 const first=page.getByLabel('發生月份');
 await expect(first).toBeFocused();
 await first.press('Shift+Tab');
 await expect(page.getByRole('button',{name:'儲存事件',exact:true})).toBeFocused();
 await page.keyboard.press('Tab');await expect(first).toBeFocused();
 await page.keyboard.press('Escape');
 await expect(page.getByRole('dialog')).toHaveCount(0);await expect(trigger).toBeFocused();
});

test('比較終點只取已勾選方案',async({page})=>{
 const {initialProject}=await import('../../src/domain/model');
 const p=structuredClone(initialProject);p.scenarios[0].profile.age=89;
 p.scenarios.push({...structuredClone(p.scenarios[0]),id:'long',name:'長期間',profile:{...p.scenarios[0].profile,age:88}});
 await page.goto('/');await page.getByRole('button',{name:'探索範例人生',exact:true}).click();
 await page.getByLabel('匯入人生存檔').setInputFiles({name:'compare.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(p))});
 await page.getByRole('button',{name:'平行人生',exact:true}).click();
 await page.getByRole('checkbox',{name:'我的人生',exact:true}).uncheck();
 await expect(page.getByRole('slider')).toHaveAttribute('max','24');
 await page.getByRole('slider').focus();await page.keyboard.press('End');
 await expect(page.locator('.comparisons article')).toContainText('第 24 月');
});

test('零利率購屋顯示分與完整資產，刪除後回復基準',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'探索範例人生',exact:true}).click();
 await page.getByRole('spinbutton',{name:'現金（元）',exact:true}).fill('3000000');
 await page.getByRole('spinbutton',{name:'月收入（元）',exact:true}).fill('0');
 await page.getByRole('spinbutton',{name:'月支出（元）',exact:true}).fill('0');
 await page.getByRole('button',{name:'更新基礎資料'}).click();
 await page.getByRole('button',{name:'⌂ 建立自己的家'}).click();
 await page.getByLabel('年利率（%）').fill('0');
 await page.getByRole('button',{name:'儲存事件',exact:true}).click();
 await page.getByRole('button',{name:'下一月',exact:true}).click();
 await expect(page.locator('.metrics')).toContainText('$977,777.78');
 await expect(page.locator('.metrics')).toContainText('其他／房屋資產');
 await expect(page.locator('.metrics')).toContainText('$10,200,000');
 await expect(page.locator('.metrics')).toContainText('$7,977,777.78');
 await expect(page.locator('.metrics')).toContainText('$3,200,000');
 await expect(page.locator('.ledger')).toContainText('房貸本息 $22,222.22');
 await page.getByRole('button',{name:'移除',exact:true}).click();
 await expect(page.locator('.metrics')).toContainText('$3,000,000');
 await expect(page.locator('svg[role=img]')).toHaveAttribute('aria-label',/租屋生活/);
});

test('畸形與過大匯入保留月份、參數與瀏覽器存檔',async({page})=>{
 const {initialProject}=await import('../../src/domain/model');
 await page.goto('/');await page.getByRole('button',{name:'探索範例人生',exact:true}).click();
 await page.getByRole('button',{name:'下一月',exact:true}).click();
 await page.getByRole('button',{name:'儲存',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('已存入');
 const cycle=structuredClone(initialProject);cycle.scenarios[0].parentId='original';cycle.scenarios[0].forkMonth=0;
 const duplicates=structuredClone(initialProject);duplicates.scenarios.push(structuredClone(duplicates.scenarios[0]));
 for(const body of ['{',JSON.stringify(cycle),JSON.stringify(duplicates),' '.repeat(2_000_001)]){
  await page.getByLabel('匯入人生存檔').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(body)});
  await expect(page.getByRole('status')).toContainText('匯入失敗');
  await expect(page.getByRole('slider')).toHaveValue('1');
  await expect(page.locator('.metrics')).toContainText('$820,000');
 }
 await page.reload();await page.getByRole('button',{name:'讀取',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('已載入');
 await expect(page.getByLabel('目前人生').locator('option')).toHaveCount(1);
});

test('儲存容量錯誤與損壞的 IndexedDB 保留目前工作',async({page})=>{
 await page.addInitScript(()=>{
  const originalPut=IDBObjectStore.prototype.put;
  IDBObjectStore.prototype.put=function(...args:Parameters<IDBObjectStore['put']>){
   if(sessionStorage.getItem('test-quota')==='yes')throw new DOMException('測試容量已滿','QuotaExceededError');
   return originalPut.apply(this,args);
  };
 });
 await page.goto('/');await page.getByRole('button',{name:'探索範例人生',exact:true}).click();
 await page.getByRole('button',{name:'儲存',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('已存入');
 await page.evaluate(()=>sessionStorage.setItem('test-quota','yes'));
 await page.getByRole('button',{name:'下一月',exact:true}).click();
 await page.getByRole('button',{name:'儲存',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('存檔操作失敗');
 await expect(page.getByRole('slider')).toHaveValue('1');
 await expect(page.locator('.metrics')).toContainText('$820,000');
 await page.evaluate(async()=>{
  sessionStorage.removeItem('test-quota');
  await new Promise<void>((resolve,reject)=>{
   const request=indexedDB.open('life-studio');
   request.onerror=()=>reject(request.error);
   request.onsuccess=()=>{
    const db=request.result,tx=db.transaction('projects','readwrite');
    tx.objectStore('projects').put({id:'current',data:{schemaVersion:99}});
    tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(tx.error);};
   };
  });
 });
 await page.getByRole('button',{name:'讀取',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('存檔操作失敗');
 await expect(page.getByRole('slider')).toHaveValue('1');
 await expect(page.locator('.metrics')).toContainText('$820,000');
 await expect(page.getByRole('button',{name:'儲存',exact:true})).toBeEnabled();
});

test('失業區間、回溯重播與版本參數備份',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'探索範例人生',exact:true}).click();
 await page.getByRole('button',{name:'◷ 職涯暫停'}).click();
 await page.getByLabel('發生月份').fill('2');await page.getByLabel('失業月數').fill('2');
 await page.getByLabel('期間每月替代收入（元）').fill('10000');
 await page.getByRole('button',{name:'儲存事件',exact:true}).click();
 const next=page.getByRole('button',{name:'下一月',exact:true});
 await next.click();await expect(page.locator('.ledger')).toContainText('月收入 $50,000');
 await next.click();await expect(page.locator('.ledger')).toContainText('月收入 $10,000');
 await expect(page.locator('svg[role=img]')).toHaveAttribute('aria-label',/暫時休息/);
 await next.click();await expect(page.locator('.ledger')).toContainText('月收入 $10,000');
 await next.click();await expect(page.locator('.ledger')).toContainText('月收入 $50,000');
 await expect(page.locator('svg[role=img]')).toHaveAttribute('aria-label',/工作中/);
 await page.getByRole('button',{name:'上一月',exact:true}).click();
 await expect(page.locator('.ledger')).toContainText('月收入 $10,000');
 await next.click();await expect(page.locator('.ledger')).toContainText('月收入 $50,000');
 await page.getByRole('button',{name:'編輯事件',exact:true}).click();
 await page.getByLabel('失業月數').fill('3');
 await page.getByRole('button',{name:'儲存事件',exact:true}).click();
 await expect(page.locator('.ledger')).toContainText('月收入 $10,000');
 const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'匯出',exact:true}).click();
 const stream=await (await downloaded).createReadStream();if(!stream)throw new Error('備份下載失敗');
 const chunks:Buffer[]=[];for await(const chunk of stream)chunks.push(Buffer.from(chunk));
 const project=JSON.parse(Buffer.concat(chunks).toString());
 expect(project.scenarios[0].revision).toBe(3);
 expect(project.scenarios[0].events[0].duration).toBe(3);
 expect(project.scenarios[0].history[1].events[0].duration).toBe(2);
});
