export interface MotionCue {token:number;start:number;duration:number;animate:boolean;kind:'home'|'work'|'month'}
export interface PlaybackFrame {scope:string;month:number;playing:boolean;speed:number;reduced:boolean}
export function isForwardStep(previous:PlaybackFrame|null,next:PlaybackFrame){return !!previous&&previous.scope===next.scope&&previous.playing&&next.playing&&previous.speed===next.speed&&next.month===previous.month+1;}
/** Finite, replaceable presentation only. The financial clock never waits for this. */
export function transition(cue:MotionCue,draw:(progress:number)=>void,settle:()=>void){
 let frame=0,done=false;
 const finish=()=>{if(done)return;done=true;cancelAnimationFrame(frame);settle();};
 if(!cue.animate||performance.now()>=cue.start+cue.duration){finish();return finish;}
 const tick=(now:number)=>{if(done)return;const p=Math.max(0,Math.min(1,(now-cue.start)/cue.duration));draw(p);if(p===1)finish();else frame=requestAnimationFrame(tick);};
 frame=requestAnimationFrame(tick);return finish;
}
