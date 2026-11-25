// Bound GPU contexts; all additional comparisons retain their SVG scene.
const leases=new Set<symbol>();
export const MAX_RENDERERS=4;
export function takeRendererSlot():null|(()=>void){if(leases.size>=MAX_RENDERERS)return null;const id=Symbol('world');leases.add(id);return ()=>{leases.delete(id);};}
export function activeRendererCount(){return leases.size;}
