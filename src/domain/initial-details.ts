import {z} from 'zod';
import type {Profile} from './model';
export const detailKeys=['income','expenses','assets','debt'] as const;
export type DetailKey=typeof detailKeys[number];
const rows=z.array(z.object({id:z.string().min(1).max(80),name:z.string().trim().min(1).max(80),amount:z.number().int().min(0).max(1_000_000_000_000)}).strict()).max(20).superRefine((items,ctx)=>{
 if(new Set(items.map(x=>x.id)).size!==items.length)ctx.addIssue({code:'custom',message:'明細 ID 重複'});
 if(items.reduce((sum,x)=>sum+x.amount,0)>1_000_000_000_000)ctx.addIssue({code:'custom',message:'明細合計超過金額上限'});
});
export const InitialDetailsSchema=z.object({version:z.literal(1),income:rows,expenses:rows,assets:rows,debt:rows}).strict();
export type InitialDetails=z.infer<typeof InitialDetailsSchema>;
export const detailTotal=(details:InitialDetails,key:DetailKey)=>details[key].reduce((sum,row)=>sum+row.amount,0);
export function detailsFromProfile(profile:Profile):InitialDetails {
 return {version:1,...Object.fromEntries(detailKeys.map(key=>[key,[{id:key+'-summary',name:'原有彙總',amount:profile[key]}]]))} as InitialDetails;
}
export function validateDetails(details:InitialDetails,profile:Profile){
 const parsed=InitialDetailsSchema.parse(details);
 for(const key of detailKeys)if(detailTotal(parsed,key)!==profile[key])throw new Error('財務明細與摘要不一致');
 return parsed;
}
export function reconcileDetails(details:InitialDetails,profile:Profile):InitialDetails{
 const result=structuredClone(details);
 for(const key of detailKeys)if(detailTotal(result,key)!==profile[key])result[key]=[{id:key+'-summary',name:'彙總調整',amount:profile[key]}];
 return validateDetails(result,profile);
}
