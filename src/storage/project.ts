import Dexie, { type EntityTable } from 'dexie';
import { parseProject } from '@/domain/scenarios';
import type { Project } from '@/domain/model';
const db=new Dexie('life-studio') as Dexie & {projects:EntityTable<{id:string;data:Project},'id'>};
db.version(1).stores({projects:'id'});
export async function saveProject(p:Project){await db.projects.put({id:'current',data:structuredClone(parseProject(p))});}
export async function loadProject():Promise<Project|null>{const row=await db.projects.get('current');return row?parseProject(row.data):null;}
export function exportProject(p:Project){return JSON.stringify(parseProject(p),null,2);}
export function importProject(json:string){if(json.length>2_000_000)throw new Error('存檔不可超過 2 MB');return parseProject(JSON.parse(json));}
