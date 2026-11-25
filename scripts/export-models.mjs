import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const names=['avatar-standing','avatar-resting','home-rented','home-owned','office-active','office-paused','finance-steady','finance-attention','park'];
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
try{
 const page=await browser.newPage();await page.goto((process.env.MODEL_BASE_URL??'http://127.0.0.1:3110').replace(/\/$/,'')+'/scene-gallery/');
 await page.getByRole('region',{name:'模型狀態圖鑑'}).waitFor();
 const rows=await page.locator('.modelGallery article').evaluateAll(nodes=>nodes.map(node=>({name:node.querySelector('h2').textContent,svg:node.querySelector('svg').outerHTML.replace('<svg','<svg xmlns="http://www.w3.org/2000/svg"')})));
 if(rows.length!==names.length)throw Error('Asset gallery does not match manifest');await mkdir('public/art/models',{recursive:true});const files=[];
 for(let i=0;i<rows.length;i++){const data=rows[i].svg+'\n',file=names[i]+'.svg';await writeFile('public/art/models/'+file,data);files.push({id:names[i],name:rows[i].name,file,bytes:Buffer.byteLength(data),sha256:createHash('sha256').update(data).digest('hex')});}
 await writeFile('public/art/models/manifest.json',JSON.stringify({version:1,source:'src/scene/models.tsx',provenance:'Original project vector artwork; no third-party images or 3D models.',assets:files},null,2)+'\n');
 console.log('Exported',files.length,'editable SVG assets;',files.reduce((n,f)=>n+f.bytes,0),'bytes total');
}finally{await browser.close();}
