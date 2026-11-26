import type {LifeEvent} from '@/domain/model';
export type TimelineScale='month'|'year'|'life';
export const TIMELINE_LABEL=104,TIMELINE_CARD=144,TIMELINE_ROW=76;
export function monthWidth(scale:TimelineScale,horizon:number,viewport:number){return scale==='month'?48:scale==='year'?16:Math.max(.5,(viewport-TIMELINE_LABEL-TIMELINE_CARD)/(horizon+1));}
export function tickStep(scale:TimelineScale,horizon:number){return scale==='month'?1:scale==='year'?12:horizon>240?120:horizon>60?24:12;}
export function rulerMonths(horizon:number,step:number){const months=Array.from({length:Math.floor(horizon/step)+1},(_,i)=>i*step);if(months.at(-1)!==horizon){if(months.length>1&&horizon-months[months.length-1]<step*.6)months.pop();months.push(horizon);}return months;}
/** Presentation packing only: preserve source order/parameters and separate visible labels. */
export function packEvents(events:LifeEvent[],cell:number,horizon:number,preview:{id:string;month:number}|null){
 const ends:number[]=[];
 const cards=[...events].sort((a,b)=>a.month-b.month||a.id.localeCompare(b.id,'en')).map(event=>{
  const at=preview?.id===event.id?preview.month:event.month,duration=event.type==='unemployment'?Math.min(event.duration,horizon-at+1):1;
  const width=Math.max(TIMELINE_CARD,duration*cell),left=at*cell;
  let row=ends.findIndex(end=>end+8<=left);if(row===-1)row=ends.length;ends[row]=left+width;
  return {event,at,duration,width,left,row};
 });
 return {cards,rows:Math.max(1,ends.length)};
}
