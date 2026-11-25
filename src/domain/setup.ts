import {type ProfileV2,type ProjectV2,V2_ENGINE_VERSION} from './model';
import {parseProject} from './scenarios';
/** Fresh V2 input, not a conversion of a persisted legacy project. */
export function createLifeProject(name:string,profile:ProfileV2,id:string):ProjectV2 {
 return parseProject({schemaVersion:2,migration:null,scenarios:[{id,name:name.trim(),engineVersion:V2_ENGINE_VERSION,parentId:null,forkMonth:null,revision:1,profile:{...profile,id:id+'-profile',version:1},events:[],history:[]}]}) as ProjectV2;
}
