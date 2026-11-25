/** Original synthesized chime: no network, files, persistent audio loop or pending queue. */
export class StudioAudio {
 private context:AudioContext|null=null;
 private voices=new Map<OscillatorNode,GainNode>();
 async enable(){try{this.context??=new AudioContext();await this.context.resume();return this.context.state==='running';}catch{return false;}}
 play(kind:'home'|'work'|'month',volume:number){
  const ctx=this.context;if(!ctx||ctx.state!=='running'||volume<=0)return;
  this.stop();
  const notes=kind==='home'?[523.25,659.25]:kind==='work'?[440,523.25]:[392,493.88];
  for(const [i,hz] of notes.entries()){
   const oscillator=ctx.createOscillator(),gain=ctx.createGain(),at=ctx.currentTime+i*.045;
   oscillator.type='sine';oscillator.frequency.value=hz;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(volume*.2,at+.015);gain.gain.exponentialRampToValueAtTime(.0001,at+.16);
   oscillator.connect(gain);gain.connect(ctx.destination);this.voices.set(oscillator,gain);
   oscillator.onended=()=>{this.voices.delete(oscillator);oscillator.disconnect();gain.disconnect();};oscillator.start(at);oscillator.stop(at+.18);
  }
 }
 stop(){for(const [voice,gain] of this.voices){voice.onended=null;try{voice.stop();}catch{}voice.disconnect();gain.disconnect();}this.voices.clear();}
 suspend(){this.stop();void this.context?.suspend().catch(()=>{});}
 close(){this.stop();void this.context?.close().catch(()=>{});this.context=null;}
}
