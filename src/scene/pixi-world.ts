import {Application,Assets,Graphics,Sprite,type Texture} from 'pixi.js';
import {transition,type MotionCue} from '../presentation/motion';
import {modelFrames,type ModelKey} from './model-catalog';
import {worldPalette as c} from './models';
export interface WorldView {owned:boolean;employed:boolean;mortgage:boolean;gap:boolean}
export interface WorldRenderer {update:(view:WorldView,cue?:MotionCue)=>void;destroy:()=>void}
let texturesPromise:Promise<Record<ModelKey,Texture>>|null=null;
function textures(){if(!texturesPromise)texturesPromise=Promise.all((Object.keys(modelFrames) as ModelKey[]).map(async key=>[key,await Assets.load<Texture>({src:(process.env.NEXT_PUBLIC_BASE_PATH??'')+'/art/models/'+key+'.svg',data:{resolution:2}})] as const)).then(rows=>Object.fromEntries(rows) as Record<ModelKey,Texture>).catch(error=>{texturesPromise=null;throw error;});return texturesPromise;}
export async function createWorldRenderer(host:HTMLElement,signal:AbortSignal,onLost:()=>void):Promise<WorldRenderer>{
 const app=new Application();let initialized=false,destroyed=false;let cancelMotion=()=>{};let canvas:HTMLCanvasElement|undefined;
 const destroy=()=>{if(destroyed)return;destroyed=true;cancelMotion();canvas?.removeEventListener('webglcontextlost',onLost);if(initialized)app.destroy({removeView:true},{children:true,texture:false,textureSource:false});};
 try{
  await app.init({width:1000,height:500,backgroundAlpha:0,antialias:true,resolution:Math.min(window.devicePixelRatio||1,2),autoDensity:true,preference:'webgl',autoStart:false,sharedTicker:false});initialized=true;
  // Interaction stays in accessible HTML; detach Pixi pointer tracking and its system ticker.
  // Pixi documents null for detaching; 8.23 declarations omit its nullable type.
  app.renderer.events.setTargetElement(null!);app.stage.eventMode='none';
  // Fixed assets are reclaimed at renderer teardown; no idle GC scheduler is needed.
  app.renderer.scheduler.destroy();
  if(signal.aborted)throw new Error('Scene cancelled');const images=await textures();if(signal.aborted)throw new Error('Scene cancelled');
  const ground=new Graphics().ellipse(502,433,350,45).fill({color:'#4c674b',alpha:.08}).poly([95,274,505,70,912,275,505,476]).fill(c.grass).poly([95,274,505,476,505,493,95,292]).fill('#9db28a').poly([505,476,912,275,912,292,505,493]).fill('#88a478').poly([95,274,505,70,505,270]).fill(c.grassLight).poly([505,70,912,275,505,270]).fill('#c5d3ab').poly([505,270,912,275,505,476]).fill(c.grassShade).poly([95,274,505,270,505,476]).fill('#d2debb');
  ground.moveTo(360,202).lineTo(680,362).moveTo(265,354).lineTo(651,161).stroke({color:'#b8c7a5',width:31});ground.moveTo(360,198).lineTo(680,358).moveTo(265,350).lineTo(651,157).stroke({color:c.path,width:22});ground.moveTo(261,353).lineTo(346,396).lineTo(392,372).stroke({color:'#dcd9bc',width:12});app.stage.addChild(ground);
  function sprite(key:ModelKey,x:number,y:number,scale=1){const frame=modelFrames[key].viewBox;const s=new Sprite(images[key]);s.anchor.set(-frame[0]/frame[2],-frame[1]/frame[3]);s.position.set(x,y);s.scale.set(scale);app.stage.addChild(s);return s;}
  sprite('tree',560,142,.7);sprite('tree',630,171,.55);sprite('tree',200,291,.7);sprite('tree',779,318,.7);sprite('tree',818,295,.5);
  const office=sprite('office-active',365,231),home=sprite('home-rented',675,323),finance=sprite('finance-steady',315,358);sprite('bench',544,404);sprite('tree',617,420,.65);sprite('tree',470,421,.48);const avatar=sprite('avatar-standing',515,287,.82);
  app.stage.addChild(new Graphics().moveTo(465,178).lineTo(465,145).stroke({color:'#a38e6d',width:3}).poly([465,145,494,156,465,166]).fill('#e3bd75'));
  canvas=app.canvas;canvas.style.width='100%';canvas.style.height='100%';canvas.setAttribute('aria-hidden','true');canvas.dataset.pixiWorld='true';canvas.addEventListener('webglcontextlost',onLost);host.append(canvas);
  let key='',motionToken=-1;const update=(v:WorldView,cue?:MotionCue)=>{if(destroyed)return;const next=[v.owned,v.employed,v.mortgage,v.gap].join(':');if(next===key&&(cue?.token??-1)===motionToken)return;cancelMotion();key=next;motionToken=cue?.token??-1;
   office.texture=images[v.employed?'office-active':'office-paused'];home.texture=images[v.owned?(v.mortgage?'home-owned':'home-owned-clear'):'home-rented'];finance.texture=images[v.gap?'finance-attention':'finance-steady'];avatar.texture=images[v.employed?'avatar-standing':'avatar-resting'];avatar.position.set(v.employed?515:544,v.employed?287:404);canvas!.dataset.worldState=key;
   const settle=()=>{avatar.position.set(v.employed?515:544,v.employed?287:404);home.alpha=office.alpha=1;canvas!.dataset.motion='idle';if(!destroyed)app.render();};
   if(cue?.animate){app.render();canvas!.dataset.motion='running';cancelMotion=transition(cue,p=>{avatar.y=(v.employed?287:404)-Math.sin(p*Math.PI)*5;if(cue.kind==='home')home.alpha=.72+p*.28;if(cue.kind==='work')office.alpha=.72+p*.28;app.render();},settle);}else settle();
  };
  return {update,destroy};
 }catch(error){destroy();throw error;}
}
