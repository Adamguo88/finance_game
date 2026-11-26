import {it,expect} from 'vitest';
import {monthWidth,packEvents,rulerMonths,tickStep,type TimelineScale} from '../src/app/components/timeline-layout';
import type {LifeEvent} from '../src/domain/model';
it('864 月、100 個密集事件在所有縮放不遮住標籤，排版不改事件輸入',()=>{
 const events:LifeEvent[]=Array.from({length:100},(_,i)=>({id:'s'+i,type:'incomeChange',version:1,month:i+1,amount:5000000})),before=structuredClone(events);
 for(const scale of ['month','year','life'] as TimelineScale[]){const cell=monthWidth(scale,864,900),{cards}=packEvents(events,cell,864,null);expect(cards).toHaveLength(100);for(let i=0;i<cards.length;i++){expect(cards[i].width).toBeGreaterThanOrEqual(144);for(let j=i+1;j<cards.length;j++)if(cards[i].row===cards[j].row)expect(cards[i].left+cards[i].width+8<=cards[j].left).toBe(true);}}
 expect(events).toEqual(before);expect(104+865*monthWidth('life',864,900)+144).toBeCloseTo(900,8);
});
it('失業期間依縮放顯示，預覽不寫入來源，所有刻度涵蓋起終點',()=>{
 const event:LifeEvent={id:'rest',type:'unemployment',version:1,month:720,duration:120,replacementIncome:0};const {cards}=packEvents([event],48,864,{id:'rest',month:750});expect(cards[0]).toMatchObject({at:750,duration:115,width:5520});expect(event.month).toBe(720);
 for(const scale of ['month','year','life'] as TimelineScale[])for(const horizon of [12,120,864]){const ticks=rulerMonths(horizon,tickStep(scale,horizon));expect(ticks[0]).toBe(0);expect(ticks.at(-1)).toBe(horizon);expect(new Set(ticks).size).toBe(ticks.length);if(ticks.length>2)expect(ticks[ticks.length-1]-ticks[ticks.length-2]).toBeGreaterThanOrEqual(tickStep(scale,horizon)*.6);}
});
