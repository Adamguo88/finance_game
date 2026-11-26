import type {LifeEvent,Scenario,SnapshotV2} from '@/domain/model';
import {simulateForDisplay} from '@/domain/engine';
export interface MemoirEntry {id:string;kind:'start'|'event'|'branch'|'gap'|'end';month:number;title:string;description:string;origin:string;locked:boolean;future:boolean;snapshot:SnapshotV2;order:number}
const money=(n:number)=>new Intl.NumberFormat('zh-TW',{style:'currency',currency:'TWD',maximumFractionDigits:2}).format(n/100);
function describe(event:LifeEvent){switch(event.type){
 case 'buyHouse':return {title:'購屋排程',description:`排定總價 ${money(event.price)}、自備款 ${money(event.downPayment)}、年利率 ${event.annualRate*100}%、${event.termMonths} 期。${event.version===2?(event.stopRent?'選擇當月停租；同月租金事件仍優先。':'未選擇停租，租金仍依排程。'):'V1 支出維持既有定義，不自動扣除租金。'}`};
 case 'unemployment':return {title:'職涯暫停排程',description:`排定第 ${event.month}–${event.month+event.duration-1} 月暫停工作，每月替代收入 ${money(event.replacementIncome)}。超出模擬期間的月份不列入快照。`};
 case 'incomeChange':return {title:'正常月薪調整',description:`排定正常月薪改為 ${money(event.amount)}；職涯暫停期間仍採替代收入。`};
 case 'rentChange':return {title:'租金調整',description:`排定每月租金改為 ${money(event.amount)}，持續到下一個租金事件。`};
}}
/** Read-only deterministic projection of the selected scenario, never its parent's current finances. */
export function buildMemoir(scenario:Scenario,observedMonth:number,parentName:string|null){
 if(!Number.isInteger(observedMonth)||observedMonth<0)throw Error('無效回顧月份');
 const rows=simulateForDisplay(scenario),horizon=rows.length-1,through=Math.min(observedMonth,horizon),entries:MemoirEntry[]=[];
 const add=(id:string,kind:MemoirEntry['kind'],month:number,title:string,description:string,origin:string,order:number,locked=false)=>entries.push({id,kind,month,title,description,origin,order,locked,future:month>through,snapshot:rows[month]});
 add('start:0','start',0,'這段模擬的起點',`從 ${scenario.profile.age} 歲開始，初始現金 ${money(scenario.profile.cash)}。${scenario.engineVersion==='1.0.0'?'V1 生活支出與固定既有負債沿用原契約。':'V2 生活費、租金與負債排程分列。'}`,'初始資料與月 0 快照',0);
 for(const event of scenario.events){const text=describe(event),locked=scenario.forkMonth!==null&&event.month<=scenario.forkMonth;add('event:'+event.id,'event',event.month,text.title,text.description,`事件 ${event.id} · type=${event.type} · version=${event.version}${locked?' · 承接排程，已鎖定':' · 本方案排程'}`,10,locked);}
 for(let month=1;month<rows.length;month++)if(rows[month].gap!==rows[month-1].gap)add('gap:'+month,'gap',month,rows[month].gap?'現金缺口開始':'現金回到非負餘額',rows[month].gap?`本月快照現金為 ${money(rows[month].cash)}，仍保留負現金，不自動借款。`:`本月快照現金為 ${money(rows[month].cash)}；這是全部已排事件及收支共同模擬的結果。`,'月度快照衍生標記，不是新增事件',20);
 if(scenario.forkMonth!==null)add('branch:'+scenario.forkMonth,'branch',scenario.forkMonth,'另一種可能的分支點',`在第 ${scenario.forkMonth} 月結束從「${parentName??scenario.parentId}」分支；此前事件已鎖定。此摘要以分支自身的資料重建，不讀取父人生後續的財務修改。`,'方案關係 parentId='+scenario.parentId,30);
 add('end:'+horizon,'end',horizon,'模型的 90 歲期間終點','以目前版本的條件模擬到這個月份，不是實際壽命預測。','模擬期間上限與月度快照',40);
 entries.sort((a,b)=>a.month-b.month||a.order-b.order||(a.id<b.id?-1:a.id>b.id?1:0));
 return {scenarioId:scenario.id,engineVersion:scenario.engineVersion,revision:scenario.revision,profileVersion:scenario.profile.version,through,horizon,entries};
}
