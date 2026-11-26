'use client';
import type {AvatarPresentation} from '@/domain/avatar-metadata';
import {AvatarModel} from '@/scene/models';
import {stageForAge,stageLabels} from '@/scene/model-catalog';
export function AvatarSettings({value,age,onChange}:{value:AvatarPresentation;age:number;onChange:(next:AvatarPresentation)=>void}){
 return <section className="avatarSettings" aria-label="角色外觀設定"><h3>你的角色</h3><div className="avatarSettingsPreview"><svg viewBox="-90 -145 180 180" role="img" aria-label="角色造型預覽"><AvatarModel hair={value.hair} clothing={value.clothing} stage={stageForAge(age)}/></svg><div><strong>{stageLabels[stageForAge(age)]} · {age} 歲</strong><p className="muted">外觀只改變呈現，不影響財務結果。生命階段隨顯示年齡變化，不代表就業或家庭狀態。</p></div></div><label>髮型<select aria-label="髮型" value={value.hair} onChange={e=>onChange({...value,hair:e.target.value as AvatarPresentation['hair']})}><option value="short">短髮</option><option value="long">長髮</option></select></label><label>服裝色彩<select aria-label="服裝色彩" value={value.clothing} onChange={e=>onChange({...value,clothing:e.target.value as AvatarPresentation['clothing']})}><option value="forest">森林綠</option><option value="ocean">海洋藍</option><option value="clay">陶土紅</option></select></label></section>;
}
