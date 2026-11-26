/** Native model coordinates shared by exports and GPU sprites. */
const baseFrames={
 'avatar-standing':{name:'角色 · 工作中',viewBox:[-90,-145,180,180]},
 'avatar-resting':{name:'角色 · 職涯暫停',viewBox:[-90,-145,180,180]},
 'home-rented':{name:'住宅 · 租屋',viewBox:[-145,-205,290,280]},
 'home-owned':{name:'住宅 · 自有住宅與房貸',viewBox:[-145,-205,290,280]},
 'home-owned-clear':{name:'住宅 · 自有住宅，房貸已結清',viewBox:[-145,-205,290,280]},
 'office-active':{name:'職場 · 工作中',viewBox:[-140,-205,280,280]},
 'office-paused':{name:'職場 · 暫停',viewBox:[-140,-205,280,280]},
 'finance-steady':{name:'財務小屋 · 平穩',viewBox:[-120,-145,240,210]},
 'finance-attention':{name:'財務小屋 · 現金缺口',viewBox:[-120,-145,240,210]},
 tree:{name:'樹木',viewBox:[-40,-115,80,130]},bench:{name:'長椅',viewBox:[-60,-55,120,100]},
 park:{name:'公園 · 休憩',viewBox:[-120,-145,240,210]}
} as const;
export const avatarHairs=['short','long'] as const;
export const avatarClothes=['forest','ocean','clay'] as const;
export const avatarStages=['young','midlife','senior'] as const;
export type LifeStage=typeof avatarStages[number];
export type AvatarModelKey=`avatar-${typeof avatarHairs[number]}-${typeof avatarClothes[number]}-${LifeStage}-${'standing'|'resting'}`;
export const stageForAge=(age:number):LifeStage=>age<40?'young':age<65?'midlife':'senior';
export const stageLabels:Record<LifeStage,string>={young:'青年',midlife:'中年',senior:'熟齡'};
export function avatarModelKey(avatar:{hair:typeof avatarHairs[number];clothing:typeof avatarClothes[number]},age:number,resting:boolean):AvatarModelKey{return `avatar-${avatar.hair}-${avatar.clothing}-${stageForAge(age)}-${resting?'resting':'standing'}`;}
export function avatarPropsFromKey(key:AvatarModelKey){const [,hair,clothing,stage,pose]=key.split('-');return {hair:hair as typeof avatarHairs[number],clothing:clothing as typeof avatarClothes[number],stage:stage as LifeStage,resting:pose==='resting'};}
export const avatarFrames=Object.fromEntries(avatarHairs.flatMap(hair=>avatarClothes.flatMap(clothing=>avatarStages.flatMap(stage=>['standing','resting'].map(pose=>[`avatar-${hair}-${clothing}-${stage}-${pose}`,{name:`角色 · ${hair==='short'?'短髮':'長髮'} · ${clothing==='forest'?'森林綠':clothing==='ocean'?'海洋藍':'陶土紅'} · ${stageLabels[stage]} · ${pose==='standing'?'工作中':'休息中'}`,viewBox:[-90,-145,180,180]}]))))) as Record<AvatarModelKey,{name:string;viewBox:number[]}>;
export const modelFrames={...baseFrames,...avatarFrames};
export type ModelKey=keyof typeof modelFrames;
