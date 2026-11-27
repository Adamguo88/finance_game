import {describe,it,expect} from 'vitest';
import {formatCents} from '../src/app/money';
describe('workspace currency displays exact integer cents',()=>{
 it.each([[0,'$0.00'],[1,'$0.01'],[-1,'-$0.01'],[1234567,'$12,345.67'],[Number.MAX_SAFE_INTEGER,'$90,071,992,547,409.91'],[-Number.MAX_SAFE_INTEGER,'-$90,071,992,547,409.91']] as const)('formats %s as %s',(amount,expected)=>expect(formatCents(amount)).toBe(expected));
 it('rejects invalid display inputs rather than rounding away bad financial data',()=>{for(const n of [1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])expect(()=>formatCents(n)).toThrow();});
});
