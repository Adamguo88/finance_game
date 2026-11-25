import type {Scenario} from './model';
import {changeEvents} from './scenarios';

/** A timing edit uses the same validation/history contract as the event form. */
export function rescheduleEvent<S extends Scenario>(scenario:S,id:string,month:number):S {
 const event=scenario.events.find(item=>item.id===id);
 if(!event)throw new Error('找不到要移動的事件');
 if(!Number.isInteger(month)||month<1||month>(90-scenario.profile.age)*12)throw new Error('事件月份超出人生期間');
 if(scenario.forkMonth!==null&&(event.month<=scenario.forkMonth||month<=scenario.forkMonth))throw new Error('分支點之前的事件不可移動');
 if(event.month===month)return scenario;
 return changeEvents(scenario,scenario.events.map(item=>item.id===id?{...item,month}:item));
}
