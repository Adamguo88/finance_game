import {it,expect} from 'vitest';
import {initialProject,type Scenario} from '../src/domain/model';
import {defaultAvatar} from '../src/domain/avatar-metadata';
import {migrateProject} from '../src/domain/migration';
import {changeProfile,changeEvents,forkScenario,parseProject,replaceScenario} from '../src/domain/scenarios';
import {detailsFromProfile} from '../src/domain/initial-details';
import {simulate} from '../src/domain/engine';
import {exportProject,importProject} from '../src/storage/project';
import {avatarFrames,avatarModelKey,stageForAge} from '../src/scene/model-catalog';
it('V1/V2套用角色只升資料格式，全月份結果與原始專案不變',()=>{
 for(const p of [initialProject,migrateProject(initialProject)]){const before=structuredClone(p),s:Scenario=p.scenarios[0],next=changeProfile(s,s.profile,undefined,{version:1,hair:'long',clothing:'ocean'}),result=replaceScenario(p,next);expect(result.schemaVersion).toBe(4);expect(next.engineVersion).toBe(s.engineVersion);expect(simulate(next)).toEqual(simulate(s));expect(p).toEqual(before);expect(importProject(exportProject(result))).toEqual(result);expect(()=>parseProject({...result,schemaVersion:3})).toThrow();}
});
it('角色、明細及修改歷史深拷貝，子分支鎖定並隔離父修改',()=>{
 const p=migrateProject(initialProject),s=p.scenarios[0],next=changeProfile(s,s.profile,detailsFromProfile(s.profile),defaultAvatar),b=forkScenario(next,'child','分支',6),copy=structuredClone(b);
 const changed=changeProfile(next,next.profile,next.initialDetails,{version:1,hair:'long',clothing:'clay'});expect(changed.history.at(-1)!.presentation).toEqual(defaultAvatar);expect(changed.history.at(-1)!.initialDetails).toEqual(next.initialDetails);expect(b).toEqual(copy);expect(b.presentation).not.toBe(next.presentation);expect(()=>changeProfile(b,b.profile,undefined,defaultAvatar)).toThrow();
 const event=changeEvents(changed,[{id:'raise',version:1,type:'incomeChange',month:12,amount:6000000}]);expect(event.history.at(-1)!.presentation).toEqual(changed.presentation);
});
it('未知造型版本／選項／歷史格式拒絕；舊檔不插入預設設定',()=>{
 const s=migrateProject(initialProject).scenarios[0];
 for(const invalid of [{...defaultAvatar,version:2},{...defaultAvatar,hair:'unknown'},{...defaultAvatar,clothing:'unknown'},{...defaultAvatar,gender:'invented'}])expect(()=>changeProfile(s,s.profile,undefined,invalid as typeof defaultAvatar)).toThrow();
 const next=changeProfile(s,s.profile,undefined,defaultAvatar),p=replaceScenario(migrateProject(initialProject),next);const broken=structuredClone(p) as any;broken.scenarios[0].history[0].presentation={...defaultAvatar,version:99};expect(()=>parseProject(broken)).toThrow();expect(importProject(exportProject(initialProject))).toEqual(initialProject);
});
it('年齡邊界與36種角色變體都存在，姿勢與年齡各自獨立',()=>{
 expect([18,39,40,64,65,90].map(stageForAge)).toEqual(['young','young','midlife','midlife','senior','senior']);expect(Object.keys(avatarFrames)).toHaveLength(36);for(const age of [18,40,65])for(const hair of ['short','long'] as const)for(const clothing of ['forest','ocean','clay'] as const)for(const resting of [true,false])expect(avatarFrames[avatarModelKey({hair,clothing},age,resting)]).toBeDefined();
});

it('V1先設定外觀仍可明確升級財務模型，保留來源版本、造型及全月份結果',()=>{
 const s:Scenario=initialProject.scenarios[0],first=changeProfile(s,s.profile,detailsFromProfile(s.profile),defaultAvatar),next=changeProfile(first,first.profile,undefined,{version:1,hair:'long',clothing:'clay'}),source=replaceScenario(initialProject,next),before=structuredClone(source),converted=migrateProject(source);
 expect(converted.schemaVersion).toBe(4);expect(converted.migration!.fromSchema).toBe(4);expect(converted.scenarios[0].presentation).toEqual(next.presentation);expect(converted.scenarios[0].history[1].presentation).toEqual(defaultAvatar);expect(converted.scenarios[0].history[1].initialDetails).toEqual(first.initialDetails);const rows=simulate(converted.scenarios[0]);simulate(next).forEach((row,i)=>expect(rows[i]).toMatchObject(row));expect(source).toEqual(before);expect(()=>migrateProject(converted)).toThrow();
});
