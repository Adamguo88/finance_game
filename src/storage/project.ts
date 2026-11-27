import Dexie, { type EntityTable } from 'dexie';
import { parseStoredProject } from '@/domain/workspace';
import type {StoredProject} from '@/domain/workspace';
const db=new Dexie('life-studio') as Dexie & {projects:EntityTable<{id:string;data:StoredProject},'id'>};
db.version(1).stores({projects:'id'});
export async function saveProject(p:StoredProject){await db.projects.put({id:'current',data:structuredClone(parseStoredProject(p))});}
export async function loadProject():Promise<StoredProject|null>{const row=await db.projects.get('current');return row?parseStoredProject(row.data):null;}
export function exportProject(p:StoredProject){return JSON.stringify(parseStoredProject(p));}
export function importProject(json:string){if(new TextEncoder().encode(json).length>2_000_000)throw new Error('存檔不可超過 2 MB');return parseStoredProject(JSON.parse(json));}
