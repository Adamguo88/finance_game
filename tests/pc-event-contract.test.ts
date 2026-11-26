import {readFileSync} from 'node:fs';
import {describe,it,expect} from 'vitest';
// Independent rational arithmetic for proposed #27 semantics. This is NOT a V3 engine.
// Future production handlers must consume these golden cases through a separate adapter.
const contract=JSON.parse(readFileSync(new URL('../docs/fixtures/pc-event-contract.json',import.meta.url),'utf8')) as {contractVersion:number;status:string;moneyUnit:string;rateUnit:string;cases:ReferenceCase[]};
type Inputs=Record<string,unknown>;
interface ReferenceCase {id:string;contracts:string[];operation:string;inputs:Inputs;expected:unknown}
function integer(p:Inputs,key:string):bigint {const v=p[key];if(typeof v!=='number'||!Number.isSafeInteger(v))throw Error('non-integer reference input');return BigInt(v);}
function amount(p:Inputs,key:string):bigint{const n=integer(p,key);if(n<0n)throw Error('negative amount');return n;}
function number(p:Inputs,key:string){return Number(integer(p,key));}
function safe(n:bigint){if(n>BigInt(Number.MAX_SAFE_INTEGER)||n< -BigInt(Number.MAX_SAFE_INTEGER))throw Error('overflow');return Number(n);}
function round(n:bigint,d:bigint){if(n<0n||d<=0n)throw Error('invalid positive rounding');return (2n*n+d)/(2n*d);}
function interest(p:bigint,bps:bigint){if(bps<0n||bps>3000n)throw Error('annual rate');return round(p*bps,120000n);}
function payment(p:bigint,bps:bigint,n:number){if(p<0n||bps<0n||bps>3000n||!Number.isInteger(n)||n<1||n>480)throw Error('loan parameters');if(bps===0n)return round(p,BigInt(n));const b=120000n,up=(b+bps)**BigInt(n),down=b**BigInt(n);return round(p*bps*up,b*(up-down));}
function value(p:bigint,bps:bigint){if(bps< -10000n)throw Error('return below total loss');return round(p*(10000n+bps),10000n);}
function reference(c:ReferenceCase):unknown{
 const p=c.inputs,a=(key:string)=>amount(p,key),i=(key:string)=>integer(p,key),n=(key:string)=>number(p,key);
 switch(c.operation){
 case 'targetedIncome':return {income:Array.from({length:n('horizon')},(_,x)=>{const m=x+1,base=m>=n('changeMonth')?a('newSalary'):a('salary');return safe(a('side')+(m>=n('start')&&m<n('end')?a('replacement'):base));})};
 case 'debtSchedules':{
  if(!Array.isArray(p.loans))throw Error('loans');const loans=p.loans.map(raw=>{const l=raw as Inputs;return {balance:amount(l,'balance'),term:number(l,'term'),first:number(l,'first'),bps:integer(l,'annualBps'),due:payment(amount(l,'balance'),integer(l,'annualBps'),number(l,'term'))};});
  const payments:number[]=[],interests:number[]=[],balances:number[]=[],flows:number[]=[];
  for(let m=1;m<=n('horizon');m++){let due=0n,cost=0n;for(const l of loans){if(m<l.first||l.balance===0n)continue;const fee=interest(l.balance,l.bps),pay=l.term===1?l.balance+fee:l.due<l.balance+fee?l.due:l.balance+fee;l.balance+=fee-pay;l.term--;due+=pay;cost+=fee;}payments.push(safe(due));interests.push(safe(cost));balances.push(safe(loans.reduce((s,l)=>s+l.balance,0n)));flows.push(safe(a('income')-a('living')-a('rent')-due));}
  return {payment:payments,interest:interests,balance:balances,cashFlow:flows};
 }
 case 'purchase':{const loan=a('price')-a('down');if(loan<0n)throw Error('down payment');const pay=payment(loan,i('annualBps'),n('term')),fee=interest(loan,i('annualBps')),cash=a('cash')-a('down')-a('fee')-pay-a('monthlyCost')-(p.stopRent===true?0n:a('rent')),debt=loan+fee-pay;return {cash:safe(cash),asset:safe(a('price')),debt:safe(debt),payment:safe(pay),netWorth:safe(cash+a('price')-debt)};}
 case 'expenseChange':return {cashFlow:safe(a('income')-a('newLiving')-a('rent'))};
 case 'oneOff':return {cashFlow:safe(a('income')-a('expense'))};
 case 'periodExpenses':{const expenses=Array.from({length:n('horizon')},(_,x)=>{const m=x+1;return safe((m>=n('start')&&m<n('end')?a('amount'):0n)+(m===n('oneOffMonth')?a('oneOff'):0n));});return {expenses,total:expenses.reduce((s,v)=>s+v,0)};}
 case 'member':return {active:Array.from({length:n('horizon')},(_,x)=>x+1>=n('start')&&x+1<n('end')),cashChange:0};
 case 'sale':{const fee=interest(a('debt'),i('annualBps')),cash=a('cash')+a('proceeds')-a('fee')-a('debt')-fee;return {cash:safe(cash),asset:0,debt:0,interest:safe(fee),netWorth:safe(cash)};}
 case 'draw':{const due=n('month')>=n('first')?payment(a('principal'),i('annualBps'),n('term')):0n,cost=due>0n?interest(a('principal'),i('annualBps')):0n,cash=a('principal')-due,debt=a('principal')+cost-due;return {cash:safe(cash),debt:safe(debt),interest:safe(cost),payment:safe(due),income:0,netWorth:safe(cash-debt)};}
 case 'settlement':{const fee=interest(a('principal'),i('annualBps'));return {cash:safe(a('cash')-a('principal')-fee-a('fee')),debt:0,interest:safe(fee),cost:safe(fee+a('fee'))};}
 case 'prepay':{const regular=payment(a('principal'),i('annualBps'),n('term')),fee=interest(a('principal'),i('annualBps')),beforeExtra=a('principal')+fee-regular;if(a('extra')>beforeExtra)throw Error('prepay above balance');const balance=beforeExtra-a('extra');let remaining=n('term')-1,next=balance===0n?0n:payment(balance,i('annualBps'),remaining);if(p.mode==='keepPayment'){next=regular;let b=balance;remaining=0;while(b>0n&&remaining<480){const charge=interest(b,i('annualBps'));if(next<=charge)throw Error('non-amortizing reference loan');b=b+charge-next;remaining++;}}else if(p.mode!=='recast')throw Error('prepayment mode');return {regular:safe(regular),balance:safe(balance),cashOut:safe(regular+a('extra')+a('fee')),nextPayment:safe(next),remainingTerm:remaining};}
 case 'refinance':{if(n('newFirst')<=n('month'))throw Error('refinance first payment');const fee=interest(a('oldPrincipal'),i('oldAnnualBps'));return {cashChange:safe(a('newPrincipal')-a('oldPrincipal')-fee-a('fee')),debt:safe(a('newPrincipal')),interest:safe(fee),oldRegularPayment:0};}
 case 'retirement':return {income:safe(a('side')+a('pension')),cashFlow:safe(a('side')+a('pension')-a('living')-a('rent'))};
 case 'lossClaims':{if(a('shareBps')>10000n||n('claimMonth')<n('lossMonth'))throw Error('claim parameters');const eligible=a('loss')-a('excluded')-a('deductible'),uncapped=round((eligible>0n?eligible:0n)*a('shareBps'),10000n),approved=uncapped<a('remainingCap')?uncapped:a('remainingCap');return {approved:safe(approved),cashFlow:Array.from({length:n('horizon')},(_,x)=>safe(-a('premium')-(x+1===n('lossMonth')?a('loss'):0n)+(x+1===n('claimMonth')?approved:0n))),remainingCap:safe(a('remainingCap')-approved)};}
 case 'reserveClaims':{if(!Array.isArray(p.requests))throw Error('claims');let remaining=a('cap');const approved=p.requests.map(v=>{const request=amount({v},'v'),paid=request<remaining?request:remaining;remaining-=paid;return safe(paid);});return {approved,remaining:safe(remaining)};}
 case 'invest':{const opening=value(a('asset'),i('monthlyBps')),gain=opening-a('asset');if(p.direction==='out'&&a('amount')>opening)throw Error('redeem above holdings');if(p.direction!=='in'&&p.direction!=='out')throw Error('investment direction');const asset=opening+(p.direction==='in'?a('amount'):-a('amount')),cash=a('cash')+(p.direction==='in'?-a('amount'):a('amount'))-a('fee');return {cash:safe(cash),asset:safe(asset),netWorth:safe(cash+asset),valuationGain:safe(gain),income:0};}
 case 'return':{const asset=value(a('asset'),i('monthlyBps'));return {asset:safe(asset),valuationGain:safe(asset-a('asset')),cashChange:0};}
 case 'inflation':{let base=a('base');const selected=Array.from({length:n('horizon')},(_,x)=>{base=x+1===n('overrideMonth')?a('overrideAmount'):value(base,i('monthlyBps'));return safe(base);});return {selectedExpense:selected,totalExpense:selected.map(v=>safe(BigInt(v)+a('rent')))};}
 case 'rateChange':{const pay=payment(a('principal'),i('annualBps'),n('term'));let balance=a('principal');const payments:number[]=[],interests:number[]=[],balances:number[]=[];for(let m=0;m<n('term');m++){const fee=interest(balance,i('annualBps')),due=m===n('term')-1?balance+fee:pay<balance+fee?pay:balance+fee;balance+=fee-due;payments.push(safe(due));interests.push(safe(fee));balances.push(safe(balance));}return {payment:payments,interest:interests,balance:balances};}
 case 'revalue':return {asset:safe(a('newValue')),netWorthChange:safe(a('newValue')-a('oldValue')),cashChange:0};
 default:throw Error('unknown reference operation '+c.operation);
 }
}
describe('PC proposed event contract: independent reference values, not production engine',()=>{
 it.each(contract.cases)('$id',fixture=>expect(reference(fixture)).toEqual(fixture.expected));
 it('covers each declared semantic group once or more with unique reference IDs',()=>{expect(contract.contractVersion).toBe(1);expect(contract.status).toBe('reference-only-not-implemented');expect(contract.moneyUnit).toBe('TWD-cent');expect(contract.rateUnit).toBe('basis-points');expect(new Set(contract.cases.map(c=>c.id)).size).toBe(contract.cases.length);expect([...new Set(contract.cases.flatMap(c=>c.contracts))].sort()).toEqual(Array.from({length:21},(_,i)=>'C'+String(i+1).padStart(2,'0')));});
 it('rejects invalid money/rates, premature refinance and over-redemption rather than inventing funding',()=>{expect(()=>amount({x:1.5},'x')).toThrow();expect(()=>amount({x:-1},'x')).toThrow();expect(()=>value(100n,-10001n)).toThrow();expect(()=>safe(BigInt(Number.MAX_SAFE_INTEGER)+1n)).toThrow();const invest=contract.cases.find(c=>c.id==='investment-redemption-not-income')!;expect(()=>reference({...invest,inputs:{...invest.inputs,amount:2000000}})).toThrow('redeem above holdings');const refi=contract.cases.find(c=>c.operation==='refinance')!;expect(()=>reference({...refi,inputs:{...refi.inputs,newFirst:1}})).toThrow('refinance first payment');});
});
