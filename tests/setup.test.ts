import {it,expect} from 'vitest';
import {initialProject} from '../src/domain/model';
import {createLifeProject} from '../src/domain/setup';
import {simulate} from '../src/domain/engine';
const profile=()=>({...initialProject.scenarios[0].profile,rent:1000000,debtSchedules:[]});
it('新人生直接建立 V2，沒有範例歷史或自動遷移記錄',()=>{const input=profile(),before=structuredClone(input),p=createLifeProject('  我的起點  ',input,'new');expect(input).toEqual(before);expect(p.migration).toBeNull();expect(p.scenarios[0]).toMatchObject({name:'我的起點',engineVersion:'2.0.0',revision:1,history:[],events:[],profile:{id:'new-profile',version:1}});expect(simulate(p.scenarios[0],1)[1].cash).toBe(81000000);});
it('無效年齡、空名稱與分數金額拒絕，不動來源',()=>{const p=profile();expect(()=>createLifeProject(' ',p,'new')).toThrow();expect(()=>createLifeProject('名字',{...p,age:17},'new')).toThrow();expect(()=>createLifeProject('名字',{...p,cash:1.5},'new')).toThrow();expect(p).toEqual(profile());});
