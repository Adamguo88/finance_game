import { z } from 'zod';
export const ENGINE_VERSION = '1.0.0' as const;
const money = z.number().int().min(0).max(1_000_000_000_000);
const month = z.number().int().min(1).max(864);
export const ProfileSchema = z.object({
 id:z.string().min(1), version:z.number().int().positive(), age:z.number().int().min(18).max(89),
 cash:money, assets:money, debt:money, income:money, expenses:money
}).strict();
const base = {id:z.string().min(1),version:z.literal(1),month};
export const EventSchema = z.discriminatedUnion('type',[
 z.object({...base,type:z.literal('buyHouse'),price:money.positive(),downPayment:money,annualRate:z.number().min(0).max(0.3),termMonths:z.number().int().min(1).max(480)})
 .strict(),
 z.object({...base,type:z.literal('unemployment'),duration:z.number().int().min(1).max(120),replacementIncome:money}).strict()
]);
export const ScenarioSchema = z.object({
 id:z.string().min(1),name:z.string().min(1).max(80),parentId:z.string().nullable(),forkMonth:z.number().int().min(0).max(863).nullable(),
 profile:ProfileSchema,engineVersion:z.literal(ENGINE_VERSION),revision:z.number().int().positive(),
 events:z.array(EventSchema).max(100),
 history:z.array(z.object({revision:z.number().int().positive(),profile:ProfileSchema,events:z.array(EventSchema).max(100)}).strict()).max(1000).default([])
}).strict();
export const ProjectSchema = z.object({
 schemaVersion:z.literal(1),engineVersion:z.literal(ENGINE_VERSION),
 scenarios:z.array(ScenarioSchema).min(1).max(20)
}).strict();
export type Profile = z.infer<typeof ProfileSchema>;
export type LifeEvent = z.infer<typeof EventSchema>;
export type Scenario = z.infer<typeof ScenarioSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export interface Snapshot {month:number;cash:number;assets:number;debt:number;netWorth:number;income:number;expenses:number;payment:number;interest:number;cashFlow:number;employed:boolean;ownsHome:boolean;gap:boolean}
export const initialProject: Project = {schemaVersion:1,engineVersion:ENGINE_VERSION,scenarios:[{
 id:'original',name:'我的人生',parentId:null,forkMonth:null,engineVersion:ENGINE_VERSION,revision:1,
 profile:{id:'profile-1',version:1,age:26,cash:80000000,assets:20000000,debt:0,income:5000000,expenses:3000000},events:[],history:[]
}]};
