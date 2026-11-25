import type {LifeEvent,Scenario,Snapshot} from './model';
import {changeEvents} from './scenarios';
import {simulate} from './engine';
export interface EventPreviewRow {month:number;before:Snapshot;after:Snapshot}
/** Disposable candidate; no source/history or persistent state is mutated. */
export function previewEvent(scenario:Scenario,event:LifeEvent):EventPreviewRow[]{
 if(event.id&&!scenario.events.some(item=>item.id===event.id))throw new Error('找不到要編輯的事件');
 let temporaryId='__event_preview__';while(scenario.events.some(item=>item.id===temporaryId))temporaryId+='_';
 const next={...event,id:event.id||temporaryId};
 const candidate=changeEvents(scenario,[...scenario.events.filter(item=>item.id!==event.id),next]);
 const before=simulate(scenario),after=simulate(candidate),horizon=before.length-1;
 return [...new Set([event.month,horizon])].map(month=>({month,before:before[month],after:after[month]}));
}
