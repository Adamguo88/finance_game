import { z } from 'zod';
import {AvatarPresentationSchema} from './avatar-metadata';
import {InitialDetailsSchema} from './initial-details';
import {
 ENGINE_VERSION, ProfileSchema, EventSchema, ScenarioSchema as BaseScenarioV1Schema,
 ProjectSchema as ProjectV1Schema, initialProject,
 type Profile as ProfileV1, type LifeEvent as LifeEventV1,
 type Project as ProjectV1, type Snapshot as SnapshotV1
} from './model-v1';
export { ENGINE_VERSION, ProfileSchema, EventSchema, ProjectV1Schema, initialProject };
export type { ProfileV1, LifeEventV1, ProjectV1, SnapshotV1 };
export const V2_ENGINE_VERSION='2.0.0' as const;
const money=z.number().int().min(0).max(1_000_000_000_000);
const month=z.number().int().min(1).max(864);
export const DebtScheduleSchema=z.object({
 id:z.string().min(1),openingBalance:money.positive(),annualRate:z.number().min(0).max(.3),
 firstPaymentMonth:month,termMonths:z.number().int().min(1).max(480)
}).strict();
export const ProfileV2Schema=ProfileSchema.extend({rent:money,debtSchedules:z.array(DebtScheduleSchema).max(20)}).strict();
const base={id:z.string().min(1),version:z.literal(1),month};
export const EventV2Schema=z.discriminatedUnion('type',[
 z.object({...base,version:z.literal(2),type:z.literal('buyHouse'),price:money.positive(),downPayment:money,annualRate:z.number().min(0).max(.3),termMonths:z.number().int().min(1).max(480),stopRent:z.boolean()}).strict(),
 z.object({...base,type:z.literal('unemployment'),duration:z.number().int().min(1).max(120),replacementIncome:money}).strict(),
 z.object({...base,type:z.literal('rentChange'),amount:money}).strict(),
 z.object({...base,type:z.literal('incomeChange'),amount:money}).strict()
]);
export const BaseScenarioV2Schema=BaseScenarioV1Schema.extend({
 engineVersion:z.literal(V2_ENGINE_VERSION),profile:ProfileV2Schema,events:z.array(EventV2Schema).max(100),
 history:z.array(z.object({revision:z.number().int().positive(),profile:ProfileV2Schema,events:z.array(EventV2Schema).max(100)}).strict()).max(1000).default([])
}).strict();
const detailExtension={initialDetails:InitialDetailsSchema.optional()};
const DetailScenarioV1Schema=BaseScenarioV1Schema.extend({...detailExtension,history:z.array(BaseScenarioV1Schema.shape.history.unwrap().element.extend(detailExtension)).max(1000).default([])}).strict();
const DetailScenarioV2Schema=BaseScenarioV2Schema.extend({...detailExtension,history:z.array(BaseScenarioV2Schema.shape.history.unwrap().element.extend(detailExtension)).max(1000).default([])}).strict();
const avatarExtension={presentation:AvatarPresentationSchema.optional()};
export const ScenarioV1Schema=DetailScenarioV1Schema.extend({...avatarExtension,history:z.array(DetailScenarioV1Schema.shape.history.unwrap().element.extend(avatarExtension)).max(1000).default([])}).strict();
export const ScenarioV2Schema=DetailScenarioV2Schema.extend({...avatarExtension,history:z.array(DetailScenarioV2Schema.shape.history.unwrap().element.extend(avatarExtension)).max(1000).default([])}).strict();
const DetailScenarioSchema=z.discriminatedUnion('engineVersion',[DetailScenarioV1Schema,DetailScenarioV2Schema]);
export const ScenarioSchema=z.discriminatedUnion('engineVersion',[ScenarioV1Schema,ScenarioV2Schema]);
const BaseScenarioSchema=z.discriminatedUnion('engineVersion',[BaseScenarioV1Schema,BaseScenarioV2Schema]);
export const MigrationRecordSchema=z.object({fromSchema:z.literal(1),fromEngine:z.literal(ENGINE_VERSION),sourceScenarioIds:z.array(z.string().min(1)).min(1).max(20)}).strict();
export const ProjectV2Schema=z.object({schemaVersion:z.literal(2),scenarios:z.array(BaseScenarioSchema).min(1).max(20),migration:MigrationRecordSchema.nullable()}).strict();
export const ProjectV3Schema=ProjectV2Schema.extend({schemaVersion:z.literal(3),scenarios:z.array(DetailScenarioSchema).min(1).max(20)}).strict();
export const MetadataMigrationRecordSchema=MigrationRecordSchema.extend({fromSchema:z.union([z.literal(1),z.literal(3),z.literal(4)])}).strict();
export const ProjectV4Schema=ProjectV3Schema.extend({schemaVersion:z.literal(4),scenarios:z.array(ScenarioSchema).min(1).max(20),migration:MetadataMigrationRecordSchema.nullable()}).strict();
export const ProjectSchema=z.discriminatedUnion('schemaVersion',[ProjectV1Schema,ProjectV2Schema,ProjectV3Schema,ProjectV4Schema]);
export type DebtSchedule=z.infer<typeof DebtScheduleSchema>;
export type ProfileV2=z.infer<typeof ProfileV2Schema>;
export type LifeEventV2=z.infer<typeof EventV2Schema>;
export type ScenarioV1=z.infer<typeof ScenarioV1Schema>;
export type ScenarioV2=z.infer<typeof ScenarioV2Schema>;
export type ProjectV2=z.infer<typeof ProjectV2Schema>;
export type Profile=ProfileV1|ProfileV2;
export type LifeEvent=LifeEventV1|LifeEventV2;
export type Scenario=ScenarioV1|ScenarioV2;
export type ProjectV3=z.infer<typeof ProjectV3Schema>;
export type ProjectV4=z.infer<typeof ProjectV4Schema>;
export type Project=ProjectV1|ProjectV2|ProjectV3|ProjectV4;
export type Snapshot=SnapshotV1;
export interface SnapshotV2 extends SnapshotV1 {
 baseIncome:number;livingExpenses:number;rent:number;mortgagePayment:number;mortgageInterest:number;
 scheduledDebtPayment:number;scheduledDebtInterest:number;scheduledDebtBalance:number;unallocatedDebt:number;mortgageBalance:number;
}
