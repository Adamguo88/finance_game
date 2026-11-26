import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createElement as h} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {transform,loadBindings} from 'next/dist/build/swc/index.js';
await loadBindings();
async function sourceModule(path){const source=await readFile(path,'utf8');const {code}=await transform(source,{filename:path,jsc:{parser:{syntax:'typescript',tsx:path.endsWith('.tsx')},target:'es2022',transform:{react:{runtime:'automatic'}}},module:{type:'es6'}});const js=code.replaceAll('"react/jsx-runtime"',JSON.stringify(import.meta.resolve('react/jsx-runtime')));return import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));}
const {AvatarModel,HomeModel,OfficeModel,FinanceModel,TreeModel,BenchModel}=await sourceModule('src/scene/models.tsx');
const {modelFrames,avatarFrames,avatarPropsFromKey}=await sourceModule('src/scene/model-catalog.ts');
const models={'avatar-standing':h(AvatarModel),'avatar-resting':h(AvatarModel,{resting:true}),'home-rented':h(HomeModel),'home-owned':h(HomeModel,{owned:true,mortgage:true}),'home-owned-clear':h(HomeModel,{owned:true}), 'office-active':h(OfficeModel),'office-paused':h(OfficeModel,{employed:false}),'finance-steady':h(FinanceModel),'finance-attention':h(FinanceModel,{attention:true}),tree:h(TreeModel),bench:h(BenchModel),park:h('g',null,h(TreeModel,{x:40}),h('g',{transform:'translate(-28 15)'},h(BenchModel)))};
for(const key of Object.keys(avatarFrames))models[key]=h(AvatarModel,avatarPropsFromKey(key));
await mkdir('public/art/models',{recursive:true});const assets=[];
for(const [id,frame] of Object.entries(modelFrames)){const [x,y,width,height]=frame.viewBox;const data=renderToStaticMarkup(h('svg',{xmlns:'http://www.w3.org/2000/svg',viewBox:[x,y,width,height].join(' '),width,height,role:'img','aria-label':frame.name},models[id]))+'\n';const file=id+'.svg';await writeFile('public/art/models/'+file,data);assets.push({id,name:frame.name,file,viewBox:frame.viewBox,bytes:Buffer.byteLength(data),sha256:createHash('sha256').update(data).digest('hex')});}
await writeFile('public/art/models/manifest.json',JSON.stringify({version:1,source:'src/scene/models.tsx',provenance:'Original project vector artwork; no third-party images or 3D models.',assets},null,2)+'\n');console.log('Exported',assets.length,'editable native-coordinate SVG assets;',assets.reduce((n,a)=>n+a.bytes,0),'bytes');
