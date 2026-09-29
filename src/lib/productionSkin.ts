import type { CharacterState } from '../types/character';
import { buildCanonicalGeometry } from '../components/CanonicalBody';
import { canonicalJoints, type JointName } from './canonicalRig';

export type VertexInfluence = { joint: JointName; weight: number };
export type VertexSkin = { vertex: number; influences: VertexInfluence[] };

const ARM_L: JointName[]=['clavicleL','upperArmL','lowerArmL','handL'];
const ARM_R: JointName[]=['clavicleR','upperArmR','lowerArmR','handR'];
const LEG_L: JointName[]=['pelvis','upperLegL','lowerLegL','footL'];
const LEG_R: JointName[]=['pelvis','upperLegR','lowerLegR','footR'];
const CORE: JointName[]=['pelvis','spine01','spine02','chest','neck'];

function distance(a:[number,number,number],b:[number,number,number]){
  return Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
}

function normalize(items: VertexInfluence[]): VertexInfluence[] {
  const top=items.sort((a,b)=>b.weight-a.weight).slice(0,4);
  const total=top.reduce((s,x)=>s+x.weight,0) || 1;
  return top.map(x=>({...x,weight:x.weight/total}));
}

/**
 * Phase 3 authored-weight baseline.
 * Stable vertex IDs + deterministic influences are more important than
 * Blender's automatic weighting because recipes must reproduce identically.
 */
export function productionSkinWeights(character: CharacterState): VertexSkin[] {
  const geometry=buildCanonicalGeometry(character);
  const position=geometry.getAttribute('position');
  const joints=new Map(canonicalJoints(character).map(j=>[j.name,j.position] as const));
  const shoulderY=joints.get('upperArmL')![1];
  const hipY=joints.get('upperLegL')![1];
  const hipX=Math.abs(joints.get('upperLegR')![0]);
  const shoulderX=Math.abs(joints.get('upperArmR')![0]);

  const result: VertexSkin[]=[];
  for(let vertex=0;vertex<position.count;vertex++){
    const p:[number,number,number]=[position.getX(vertex),position.getY(vertex),position.getZ(vertex)];
    let candidates: JointName[];
    if(p[1] < hipY + .18 && Math.abs(p[0]) > hipX*.42) candidates=p[0]<0?LEG_L:LEG_R;
    else if(p[1] > shoulderY-.34 && Math.abs(p[0]) > shoulderX*.62) candidates=p[0]<0?ARM_L:ARM_R;
    else candidates=CORE;

    const influences=normalize(candidates.map(joint=>{
      const d=Math.max(.035,distance(p,joints.get(joint)!));
      return {joint,weight:1/(d*d)};
    }));
    result.push({vertex,influences});
  }
  geometry.dispose();
  return result;
}

export function validateSkinWeights(weights: VertexSkin[]) {
  return weights.every((skin,index)=>
    skin.vertex===index &&
    skin.influences.length>0 &&
    skin.influences.length<=4 &&
    Math.abs(skin.influences.reduce((s,x)=>s+x.weight,0)-1)<1e-5
  );
}
