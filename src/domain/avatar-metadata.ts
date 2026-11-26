import {z} from 'zod';
/** Saved user input only; no financial effect or inferred personal attributes. */
export const AvatarPresentationSchema=z.object({version:z.literal(1),hair:z.enum(['short','long']),clothing:z.enum(['forest','ocean','clay'])}).strict();
export type AvatarPresentation=z.infer<typeof AvatarPresentationSchema>;
export const defaultAvatar:AvatarPresentation={version:1,hair:'short',clothing:'forest'};
