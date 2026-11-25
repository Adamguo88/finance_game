import {it,expect,vi,afterEach} from 'vitest';
import {isForwardStep,transition,type PlaybackFrame} from '../src/presentation/motion';
afterEach(()=>vi.unstubAllGlobals());
const frame:PlaybackFrame={scope:'same',month:0,playing:true,speed:1,reduced:false};
it('僅連續同方案同速度往前一月可轉場，回溯跳月切模式及開始播放不補播',()=>{
 expect(isForwardStep(frame,{...frame,month:1})).toBe(true);
 for(const next of [{...frame,month:0},{...frame,month:2},{...frame,month:1,scope:'other'},{...frame,month:1,speed:12},{...frame,month:1,playing:false}])expect(isForwardStep(frame,next)).toBe(false);
 expect(isForwardStep({...frame,playing:false},{...frame,month:1})).toBe(false);expect(isForwardStep(null,frame)).toBe(false);
});
it('有限動畫使用共享時間，完成或取消不殘留 RAF；過期轉場直接落定',()=>{
 const callbacks=new Map<number,FrameRequestCallback>();let id=0;
 vi.stubGlobal('requestAnimationFrame',(cb:FrameRequestCallback)=>{callbacks.set(++id,cb);return id;});vi.stubGlobal('cancelAnimationFrame',(n:number)=>callbacks.delete(n));
 const draw=vi.fn(),settle=vi.fn(),start=performance.now(),cancel=transition({token:1,start,duration:200,animate:true,kind:'home'},draw,settle);
 const first=id,cb=callbacks.get(first)!;callbacks.delete(first);cb(start+100);expect(draw).toHaveBeenLastCalledWith(.5);cancel();cancel();expect(settle).toHaveBeenCalledTimes(1);expect(callbacks.size).toBe(0);
 const late=vi.fn();transition({token:2,start:0,duration:1,animate:true,kind:'month'},draw,late);expect(late).toHaveBeenCalledTimes(1);
});
