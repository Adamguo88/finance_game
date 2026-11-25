import type {LifeEvent,Scenario} from '@/domain/model';
export type EventType=LifeEvent['type'];
export const eventCatalog=[
 {type:'buyHouse',name:'建立自己的家',category:'住宅',description:'指定購屋月份、自備款與貸款，觀察現金與房貸負擔。',parameters:'房價、自備款、年利率、期數；V2 可選購屋停租。',effect:'購屋當月支付自備款並開始還款，房價維持固定。',keywords:'買房 住宅 房貸 貸款'},
 {type:'unemployment',name:'職涯暫停',category:'職涯',description:'自行安排工作中斷或休息期間，設定期間收入。',parameters:'開始月份、持續月數、每月替代收入。',effect:'指定期間改用替代收入，結束後恢復正常薪資。',keywords:'失業 休息 收入中斷'},
 {type:'rentChange',name:'調整月租金',category:'住宅',description:'搬家或換約後，從指定月份改用新的每月租金。',parameters:'生效月份、新的月租金。',effect:'以新金額取代租金，持續至下一次租金事件。',keywords:'搬家 租屋 房租 換約'},
 {type:'incomeChange',name:'調整正常月薪',category:'職涯',description:'設定加薪、轉職或調整薪資後的正常月收入。',parameters:'生效月份、新的正常月薪。',effect:'以新金額取代正常薪資；失業期間仍採替代收入。',keywords:'加薪 轉職 薪水 工作 薪資'}
] as const;
export function unavailableReason(type:EventType,scenario:Scenario):string|null{
 if((type==='rentChange'||type==='incomeChange')&&scenario.engineVersion!=='2.0.0')return '需先升級財務模型至 V2。';
 if(scenario.events.length>=100)return '此方案已達 100 個事件上限。';
 if(type==='buyHouse'&&scenario.events.some(event=>event.type==='buyHouse'))return '此方案已有購屋事件，請從事件清單編輯。';
 return null;
}
export function createEventDraft(type:EventType,scenario:Scenario,currentMonth:number):LifeEvent{
 const reason=unavailableReason(type,scenario);if(reason)throw new Error(reason);
 const month=Math.min((90-scenario.profile.age)*12,Math.max(currentMonth+1,(scenario.forkMonth??0)+1));
 const base={id:'',month};
 switch(type){
  case 'buyHouse':{const home={...base,type,price:1000000000,downPayment:200000000,annualRate:.025,termMonths:360};return scenario.engineVersion==='2.0.0'?{...home,version:2,stopRent:false}:{...home,version:1};}
  case 'unemployment':return {...base,version:1,type,duration:6,replacementIncome:0};
  case 'incomeChange':return {...base,version:1,type,amount:scenario.profile.income};
  case 'rentChange':return {...base,version:1,type,amount:'rent' in scenario.profile?scenario.profile.rent:0};
 }
}
