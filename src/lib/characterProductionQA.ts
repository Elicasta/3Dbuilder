import type { BufferGeometry } from 'three';
import type { CharacterState } from '../types/character';
import { makeHumanBones, makeHumanSkinWeights } from './makehumanRig';

export type ProductionGate='pass'|'warn'|'fail';
export interface ProductionCheck {id:string;label:string;gate:ProductionGate;detail:string}
export interface CharacterProductionReport {
  ready:boolean;
  score:number;
  checks:ProductionCheck[];
  counts:{vertices:number;triangles:number;bones:number;weightedVertices:number;unweightedVertices:number;uvVertices:number};
}

function check(id:string,label:string,gate:ProductionGate,detail:string):ProductionCheck{return{id,label,gate,detail}}
function assetMatch(character:CharacterState,terms:string[]){return character.equippedAssets.some(p=>terms.some(t=>p.toLowerCase().includes(t)))}

export function inspectMakeHumanProductionAsset(
  geometry:BufferGeometry,
  character:CharacterState,
  skeletonText:string|null,
  weightsText:string|null
):CharacterProductionReport{
  const position=geometry.getAttribute('position');
  const uv=geometry.getAttribute('uv');
  const index=geometry.getIndex();
  const vertices=position?.count??0;
  const triangles=index?Math.floor(index.count/3):Math.floor(vertices/3);
  let bones=0,weightedVertices=0,unweightedVertices=vertices;
  const checks:ProductionCheck[]=[];

  checks.push(check('topology','Stable production topology',vertices>1000&&triangles>1000?'pass':'fail',`${vertices.toLocaleString()} verts · ${triangles.toLocaleString()} tris`));
  const uvVertices=uv?.count??0;
  checks.push(check('uv','UV set',uvVertices===vertices&&vertices>0?'pass':'fail',uvVertices===vertices?'UV coverage matches vertex count':'Missing/incomplete UV coordinates'));

  if(skeletonText&&weightsText){
    try{
      const rig=makeHumanBones(geometry,skeletonText);bones=rig.length;
      const skin=makeHumanSkinWeights(weightsText,vertices);
      weightedVertices=skin.filter(v=>v.influences.length>0).length;unweightedVertices=vertices-weightedVertices;
      const invalid=skin.filter(v=>v.influences.length>4||Math.abs(v.influences.reduce((s,x)=>s+x.weight,0)-1)>.001).length;
      checks.push(check('skeleton','Deformation skeleton',bones>=20?'pass':'fail',`${bones} bones resolved from deformed surface landmarks`));
      checks.push(check('weights','Skin weights',unweightedVertices===0&&invalid===0?'pass':'fail',`${weightedVertices}/${vertices} weighted · ${invalid} invalid influence sets`));
    }catch(error){checks.push(check('rig','Rig evaluation','fail',String(error)))}
  }else{
    checks.push(check('skeleton','Deformation skeleton','fail','MakeHuman skeleton data not loaded'));
    checks.push(check('weights','Skin weights','fail','MakeHuman weight data not loaded'));
  }

  const eyes=assetMatch(character,['eye','eyeball']);
  const teeth=assetMatch(character,['teeth','tooth']);
  const tongue=assetMatch(character,['tongue']);
  checks.push(check('eyes','Separate eyes',eyes?'pass':'warn',eyes?'Eye asset present':'No explicit production eye asset selected'));
  checks.push(check('oral','Teeth / tongue',teeth&&tongue?'pass':'warn',teeth&&tongue?'Oral components present':`teeth ${teeth?'yes':'no'} · tongue ${tongue?'yes':'no'}`));

  checks.push(check('materials','PBR material set','warn','Material parser exists, but texture image loading / channel validation is not production-complete'));
  checks.push(check('deformation','Pose deformation QA','warn','Neutral rig data exists; production pose/corrective validation is not yet executed on hm08'));
  checks.push(check('face-rig','Facial articulation','warn','Identity morphs exist, but an animation-ready facial rig/expression set is not yet present'));
  checks.push(check('lod','LOD chain','warn','No generated production LOD chain is attached to this character yet'));
  checks.push(check('export','Engine handoff','warn','GLB/FBX skeletal export validation is not yet certified for the MakeHuman production path'));

  const fail=checks.filter(c=>c.gate==='fail').length,warn=checks.filter(c=>c.gate==='warn').length;
  const score=Math.max(0,Math.round(100-(fail*18+warn*6)));
  return {ready:fail===0&&warn===0,score,checks,counts:{vertices,triangles,bones,weightedVertices,unweightedVertices,uvVertices}};
}
