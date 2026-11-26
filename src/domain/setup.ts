import type {InitialDetails} from './initial-details';
import {type ProfileV2,type ProjectV2,V2_ENGINE_VERSION} from './model';
import {parseProject} from './scenarios';
/** Fresh V2 input, not a conversion of a persisted legacy project. */
export function createLifeProject(name:string,profile:ProfileV2,id:string,initialDetails?:InitialDetails):ProjectV2 | (Omit<ProjectV2,'schemaVersion'>&{schemaVersion:3}) {
 return parseProject({schemaVersion:initialDetails?3:2,migration:null,scenarios:[{id,name:name.trim(),engineVersion:V2_ENGINE_VERSION,parentId:null,forkMonth:null,revision:1,...(initialDetails?{initialDetails}:{}),profile:{...profile,id:id+'-profile',version:1},events:[],history:[]}]}) as ProjectV2 | (Omit<ProjectV2,'schemaVersion'>&{schemaVersion:3});
}
