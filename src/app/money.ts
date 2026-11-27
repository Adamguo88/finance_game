const wholeCurrency=new Intl.NumberFormat('zh-TW',{style:'currency',currency:'TWD',minimumFractionDigits:0,maximumFractionDigits:0});
/** Keep the cents exact even when a safe-integer balance exceeds Number/100's cent precision. */
export function formatCents(amount:number):string{
 if(!Number.isSafeInteger(amount))throw Error('金額不是安全整數分');
 const value=BigInt(amount),absolute=value<0n?-value:value;
 return (value<0n?'-':'')+wholeCurrency.format(absolute/100n)+'.'+String(absolute%100n).padStart(2,'0');
}
