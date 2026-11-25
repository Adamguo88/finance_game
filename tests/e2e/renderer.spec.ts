import {test,expect} from '@playwright/test';
import {initialProject} from '../../src/domain/model';
// Real WebGL pipeline on a software GPU, reproducible on headless CI.
test.use({launchOptions:{...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}});
test('Pixi 真實畫布切月更新，context lost 備援後仍可操作',async({page},info)=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await page.getByRole('button',{name:'探索範例人生',exact:true}).click();
 const world=page.locator('.lifeWorld');await expect(world).toHaveAttribute('data-renderer','pixi');
 const canvas=world.locator('canvas');await expect(canvas).toHaveAttribute('data-world-state','false:true:false:false');
 const before=await canvas.screenshot();
 const p=structuredClone(initialProject);p.scenarios[0].events=[{id:'rest',type:'unemployment',version:1,month:1,duration:2,replacementIncome:0}];
 await page.getByLabel('匯入人生存檔').setInputFiles({name:'gpu.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(p))});await expect(page.getByRole('status')).toContainText('匯入成功');
 await page.getByRole('button',{name:'下一月',exact:true}).click();await expect(canvas).toHaveAttribute('data-world-state','false:false:false:false');
 expect(Buffer.compare(before,await canvas.screenshot())).not.toBe(0);await world.screenshot({path:info.outputPath('pc-pixi-world.png')});
 await canvas.evaluate(el=>{const gl=(el as HTMLCanvasElement).getContext('webgl2');if(!gl)throw Error('WebGL2 context missing');gl.getExtension('WEBGL_lose_context')!.loseContext();});
 await expect(world).toHaveAttribute('data-renderer','svg');await expect(canvas).toHaveCount(0);
 await page.getByRole('button',{name:'工作區：暫時休息',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();expect(errors).toEqual([]);
});
test('GPU 不可用保留可讀 SVG 與鍵盤入口',async({page})=>{
 await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(this:HTMLCanvasElement,...args:unknown[]){if(String(args[0]).startsWith('webgl'))return null;return original.apply(this,args as never);} as typeof original;});
 await page.goto('/');await page.getByRole('button',{name:'探索範例人生',exact:true}).click();await expect(page.locator('.lifeWorld')).toHaveAttribute('data-renderer','svg');await expect(page.locator('.lifeWorld canvas')).toHaveCount(0);
 const home=page.getByRole('button',{name:'住宅區：租屋生活',exact:true});await home.focus();await page.keyboard.press('Enter');await expect(page.getByRole('dialog',{name:'我的居所'})).toBeVisible();
});
test('20 人生同月比較限制四個 GPU，切換模式後釋放並可重新建立',async({page})=>{
 const p=structuredClone(initialProject);p.scenarios=Array.from({length:20},(_,i)=>({...structuredClone(p.scenarios[0]),id:'life-'+i,name:'人生 '+i,events:i%2===0?[{id:'pause-'+i,type:'unemployment',version:1,month:1,duration:1,replacementIncome:0}]:[]}));
 await page.goto('/');await page.getByRole('button',{name:'探索範例人生',exact:true}).click();await page.getByLabel('匯入人生存檔').setInputFiles({name:'twenty.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(p))});await expect(page.getByRole('status')).toContainText('匯入成功');
 for(let cycle=0;cycle<3;cycle++){
  await page.getByRole('button',{name:'平行人生',exact:true}).click();for(const box of await page.locator('.compareSelect input').all())await box.check();
  await expect(page.locator('.comparisons .lifeWorld')).toHaveCount(20);await expect(page.locator('.lifeWorld[data-renderer="loading"]')).toHaveCount(0);
  const count=await page.locator('.lifeWorld canvas').count();expect(count).toBeGreaterThan(0);expect(count).toBeLessThanOrEqual(4);
  await page.getByRole('button',{name:'下一月',exact:true}).click();await expect(page.locator('.comparisons article').first()).toContainText('第 '+(cycle+1)+' 月');await expect(page.locator('.comparisons article').last()).toContainText('第 '+(cycle+1)+' 月');
  for(let i=0;i<20;i++){const world=page.locator('.comparisons .lifeWorld').nth(i),employed=cycle!==0||i%2!==0;await expect(world).toHaveAttribute('data-work',employed?'active':'resting');const canvas=world.locator('canvas');if(await canvas.count())await expect(canvas).toHaveAttribute('data-world-state','false:'+employed+':false:false');}
  await page.getByRole('button',{name:'體驗',exact:true}).click();await expect(page.locator('.lifeWorld[data-renderer="pixi"]')).toHaveCount(1);await expect(page.locator('.lifeWorld canvas')).toHaveCount(1);
 }
});

test('資產載入失敗維持靜態世界，不阻擋月份控制',async({page})=>{
 await page.route('**/art/models/*.svg',route=>route.abort());await page.goto('/');await page.getByRole('button',{name:'探索範例人生',exact:true}).click();
 await expect(page.locator('.lifeWorld')).toHaveAttribute('data-renderer','svg');await page.getByRole('button',{name:'下一月',exact:true}).click();await expect(page.getByRole('slider')).toHaveValue('1');await expect(page.locator('.lifeWorld svg')).toBeVisible();
});

test('靜止場景沒有持續 requestAnimationFrame 迴圈',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'探索範例人生',exact:true}).click();await expect(page.locator('.lifeWorld')).toHaveAttribute('data-renderer','pixi');
 const calls=await page.evaluate(async()=>{const original=window.requestAnimationFrame;let count=0;window.requestAnimationFrame=(cb)=>{count++;return original(cb);};await new Promise(resolve=>setTimeout(resolve,500));window.requestAnimationFrame=original;return count;});expect(calls).toBeLessThanOrEqual(2);
});
