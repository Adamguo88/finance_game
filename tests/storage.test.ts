import {describe,it,expect} from 'vitest';
import {initialProject} from '../src/domain/model';
import {migrateProject} from '../src/domain/migration';
import {exportProject,importProject} from '../src/storage/project';

describe('版本化 JSON 備份',()=>{
 it('V1/V2 均可 round trip，匯出不修改參數',()=>{
  for(const project of [structuredClone(initialProject),migrateProject(initialProject)]){
   const before=JSON.stringify(project);expect(importProject(exportProject(project))).toEqual(project);expect(JSON.stringify(project)).toBe(before);
  }
 });
 it('接近 2 MB 的有效專案不因美化排版而無法匯入',()=>{
  const project=structuredClone(initialProject),scenario=project.scenarios[0];
  scenario.profile.id='x'.repeat(1999000);
  const backup=exportProject(project);
  expect(new TextEncoder().encode(backup).length).toBeLessThanOrEqual(2000000);
  expect(importProject(backup)).toEqual(project);
 });
 it('UTF-8 字節超限、未知版本與畸形 JSON 拒絕',()=>{
  expect(()=>importProject(' '.repeat(2000001))).toThrow('2 MB');
  const oversized={...initialProject,scenarios:[{...initialProject.scenarios[0],profile:{...initialProject.scenarios[0].profile,id:'中'.repeat(700000)}}]};
  const text=JSON.stringify(oversized);expect(text.length).toBeLessThan(2000000);
  expect(()=>importProject(text)).toThrow('2 MB');
  expect(()=>importProject('{')).toThrow();expect(()=>importProject('{"schemaVersion":99}')).toThrow();
 });
});
