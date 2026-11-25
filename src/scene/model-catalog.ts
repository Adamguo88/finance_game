/** Native model coordinates shared by exports and GPU sprites. */
export const modelFrames={
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
export type ModelKey=keyof typeof modelFrames;
