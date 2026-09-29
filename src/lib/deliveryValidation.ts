import type { CharacterProductionReport, ProductionCheck } from './characterProductionQA';

export type DeliveryTarget='cinematic'|'game-hero'|'game-crowd';
export interface DeliveryReport {target:DeliveryTarget;ready:boolean;checks:ProductionCheck[]}

export function validateDelivery(base:CharacterProductionReport,target:DeliveryTarget):DeliveryReport{
  const checks=[...base.checks];
  const add=(id:string,label:string,gate:'warn'|'fail',detail:string)=>checks.push({id,label,gate,detail});
  if(target==='cinematic'){
    add('cinematic-face','Cinematic facial deformation','fail','Requires expression set, eyelid/eye coordination, jaw/tongue articulation and corrective shapes.');
    add('cinematic-skin','Skin shading','fail','Requires loaded BaseColor/Normal/Roughness plus validated subsurface/eye shading.');
    add('cinematic-hair','Hair/groom','warn','Requires groom or validated high-quality hair asset with scalp coverage.');
  }else if(target==='game-hero'){
    add('hero-lods','Hero LODs','fail','Requires validated skeletal LOD chain with preserved silhouette and compatible skinning.');
    add('hero-engine','Engine import','fail','Requires skeletal GLB/FBX import smoke test with materials, scale, axes and animation.');
    add('hero-physics','Physics/collision','warn','Requires target-engine physics/collision profile for gameplay use.');
  }else{
    add('crowd-lods','Crowd LODs','fail','Requires aggressive LOD chain and material/groom simplification.');
    add('crowd-budget','Runtime budget','fail','Requires explicit triangle, bone, material, texture-memory and draw-call budgets.');
  }
  return {target,ready:checks.every(c=>c.gate==='pass'),checks};
}
