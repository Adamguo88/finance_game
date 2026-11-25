'use client';
import type {SnapshotV2} from '@/domain/model';
import type {WorldArea} from '@/scene/LifeWorld';
import {useModalFocus} from './FinancialForms';
const money=(n:number)=>new Intl.NumberFormat('zh-TW',{style:'currency',currency:'TWD',maximumFractionDigits:2}).format(n/100);
const titles={home:'我的居所',work:'我的工作',finance:'財務小屋',park:'生活的留白'};
export function WorldInspector({area,snapshot:s,onClose,onConfigure,returnFocus}:{area:WorldArea;snapshot:SnapshotV2;onClose:()=>void;onConfigure:()=>void;returnFocus:HTMLElement|null}){
 const ref=useModalFocus(true,onClose,returnFocus);
 const rows=area==='home'?[['目前居住',s.ownsHome?'自己的家':'租屋生活'],['本月租金',money(s.rent)],['房貸餘額',money(s.mortgageBalance)],['本月房貸本息',money(s.mortgagePayment)]]:area==='work'?[['目前狀態',s.employed?'工作中':'職涯暫停'],['正常月薪',money(s.baseIncome)],['本月實際收入',money(s.income)]]:area==='finance'?[['可動用現金',money(s.cash)],['其他／房屋資產',money(s.assets)],['總負債',money(s.debt)],['淨資產',money(s.netWorth)]]:[];
 return <section ref={ref} className="editor" role="dialog" aria-modal="true" aria-label={titles[area]}><div className="worldInspector"><p className="eyebrow">YOUR LIVING WORLD · 第 {s.month} 月</p><h2>{titles[area]}</h2>{area==='park'?<p>每段人生都需要留白。你可以暫停、回到一個時刻，或創造另一種可能；這裡沒有唯一的成功標準。</p>:<dl>{rows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}{s.month===0&&area!=='park'&&<p className="muted">月 0 是起始餘額，月度收支從第 1 月開始。</p>}{area==='finance'&&s.gap&&<p className="warning">目前有現金缺口，系統不會自動借款。</p>}<div className="actions"><button onClick={onClose}>回到世界</button>{area!=='park'&&<button className="primary" onClick={onConfigure}>{area==='finance'?'檢視初始資料':area==='home'?'規劃住宅選擇':'規劃職涯選擇'}</button>}</div></div></section>;
}
