import {test,expect} from '@playwright/test';
import {initialProject} from '../../src/domain/model';
test.use({launchOptions:{...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}});
test('播放角色轉場可中止，系統減少動態與背景分頁立即落定',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');await page.getByRole('button',{name:'探索範例人生',exact:true}).click();const canvas=page.locator('.lifeWorld canvas');await expect(canvas).toHaveCount(1);
 await page.getByRole('button',{name:'播放',exact:true}).click();await page.waitForFunction(()=>!!document.querySelector('.lifeWorld canvas[data-motion=running]')); await page.getByRole('button',{name:'暫停',exact:true}).click();await expect(canvas).toHaveAttribute('data-motion','idle');
 await page.getByText('體驗設定',{exact:true}).click();await page.emulateMedia({reducedMotion:'reduce'});await expect(page.getByRole('checkbox',{name:'減少動態效果',exact:true})).toBeChecked();await expect(page.getByRole('checkbox',{name:'減少動態效果',exact:true})).toBeDisabled();
 await page.getByRole('button',{name:'播放',exact:true}).click();await expect(page.getByRole('slider')).not.toHaveValue('0');await expect(canvas).toHaveAttribute('data-motion','idle');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.getByRole('button',{name:'播放',exact:true})).toBeVisible();await expect(canvas).toHaveAttribute('data-motion','idle');
});
test('音效須主動開啟；事件重播不重複發聲，偏好不寫入財務存檔',async({page})=>{
 await page.addInitScript(()=>{
  const state={created:0,starts:0};(window as unknown as {audioProbe:typeof state}).audioProbe=state;
  const Base=AudioContext;window.AudioContext=class extends Base{constructor(){super();state.created++;}createOscillator(){const node=super.createOscillator(),start=node.start.bind(node);node.start=(at?:number)=>{state.starts++;start(at);};return node;}};
 });
 await page.goto('/');await page.getByRole('button',{name:'探索範例人生',exact:true}).click();await page.getByText('體驗設定',{exact:true}).click();await expect(page.getByRole('checkbox',{name:'靜音',exact:true})).toBeChecked();expect(await page.evaluate(()=>(window as unknown as {audioProbe:{created:number}}).audioProbe.created)).toBe(0);
 const project=structuredClone(initialProject);project.scenarios[0].events=[{id:'rest',type:'unemployment',version:1,month:1,duration:1,replacementIncome:0}];await page.getByLabel('匯入人生存檔').setInputFiles({name:'sound.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(project))});await expect(page.getByRole('status')).toContainText('匯入成功');
 await page.getByRole('checkbox',{name:'靜音',exact:true}).uncheck();await page.getByLabel('播放速度').selectOption('1');await page.getByRole('button',{name:'播放',exact:true}).click();
 const starts=()=>page.evaluate(()=>(window as unknown as {audioProbe:{starts:number}}).audioProbe.starts);await expect.poll(starts).toBe(2);await page.getByRole('button',{name:'暫停',exact:true}).click();
 await page.getByRole('slider').fill('0');await page.getByRole('button',{name:'播放',exact:true}).click();await expect(page.getByRole('slider')).not.toHaveValue('0');await page.getByRole('button',{name:'暫停',exact:true}).click();expect(await starts()).toBe(2);
 await page.getByRole('checkbox',{name:'減少動態效果',exact:true}).check();const download=page.waitForEvent('download');await page.getByRole('button',{name:'匯出',exact:true}).click();const stream=await(await download).createReadStream();const chunks:Buffer[]=[];for await(const chunk of stream!)chunks.push(Buffer.from(chunk));expect(JSON.parse(Buffer.concat(chunks).toString())).toEqual(project);
 await page.reload();await page.getByText('體驗設定',{exact:true}).click();await expect(page.getByRole('checkbox',{name:'減少動態效果',exact:true})).toBeChecked();expect(await page.evaluate(()=>(window as unknown as {audioProbe:{created:number}}).audioProbe.created)).toBe(0);
});
test('比較共用轉場時間，切速度、回溯與跳月不排隊，回到編輯停止動畫',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'探索範例人生',exact:true}).click();await page.getByRole('button',{name:'從第 0 月建立分支'}).click();await page.getByRole('button',{name:'平行人生',exact:true}).click();await expect(page.locator('.lifeWorld canvas')).toHaveCount(2);
 await page.getByRole('button',{name:'播放',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.lifeWorld canvas[data-motion=running]').length===2);
 for(const speed of ['4','12']){await page.getByLabel('播放速度').selectOption(speed);await expect(page.locator('.lifeWorld canvas[data-motion=running]')).toHaveCount(0);}
 await page.getByRole('button',{name:'暫停',exact:true}).click();await page.getByRole('slider').fill('12');await expect(page.locator('.lifeWorld canvas[data-motion=running]')).toHaveCount(0);await expect(page.locator('.comparisons article').first()).toContainText('第 12 月');await expect(page.locator('.comparisons article').last()).toContainText('第 12 月');
 await page.getByRole('button',{name:'上一月',exact:true}).click();await expect(page.getByRole('slider')).toHaveValue('11');await page.getByRole('button',{name:'編輯',exact:true}).click();await expect(page.locator('.lifeWorld canvas')).toHaveCount(1);await expect(page.locator('.lifeWorld canvas')).toHaveAttribute('data-motion','idle');
});
