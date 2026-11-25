import {it,expect} from 'vitest';
import {takeRendererSlot,activeRendererCount,MAX_RENDERERS} from '../src/scene/renderer-slots';
it('多人生限制同時 GPU 數，重複清理不誤釋放其他場景，卸載後可重用',()=>{
 const releases:Array<()=>void>=[];
 try{
  for(let i=0;i<MAX_RENDERERS;i++){const release=takeRendererSlot();expect(release).not.toBeNull();releases.push(release!);}
  expect(activeRendererCount()).toBe(MAX_RENDERERS);expect(takeRendererSlot()).toBeNull();
  releases[0]();releases[0]();expect(activeRendererCount()).toBe(MAX_RENDERERS-1);
  const replacement=takeRendererSlot();expect(replacement).not.toBeNull();releases.push(replacement!);
  releases[0]();expect(activeRendererCount()).toBe(MAX_RENDERERS);expect(takeRendererSlot()).toBeNull();
 }finally{releases.forEach(release=>release());}
 expect(activeRendererCount()).toBe(0);
});
