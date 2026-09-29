import type { BufferGeometry } from 'three';
import type { BodyMorphs, CharacterState } from '../types/character';
import { evaluateMakeHumanGeometry } from './makehumanCharacter';
import { compareProfiles, measureCanonicalMesh, type ProfileResidual } from './meshProfile';

export const FIT_KEYS=['shoulders','chest','waist','hips','chestDepth','hipDepth'] as const;
export type FitKey=typeof FIT_KEYS[number];
export const FIT_LIMITS:Record<FitKey,[number,number]>={
  shoulders:[.82,1.18],chest:[.80,1.20],waist:[.80,1.20],hips:[.80,1.20],chestDepth:[.78,1.22],hipDepth:[.78,1.22]
};
export interface FitTarget {front:{shoulderWidth:number|null;chestWidth:number|null;waistWidth:number|null;hipWidth:number|null}|null;side:{chestWidth:number|null;waistWidth:number|null;hipWidth:number|null}|null}
export interface FitReport {initialLoss:number;bestLoss:number;iterations:number;converged:boolean;validTerms:number;trace:number[]}
function clamp(key:FitKey,v:number){const [lo,hi]=FIT_LIMITS[key];return Math.max(lo,Math.min(hi,v))}
function residualFor(key:FitKey,r:ProfileResidual){return ({shoulders:r.shoulder,chest:r.chest,waist:r.waist,hips:r.hip,chestDepth:r.chestDepth,hipDepth:r.hipDepth} as const)[key]}
async function evaluate(obj:string,state:CharacterState,target:FitTarget){
  const e=await evaluateMakeHumanGeometry(obj,state);
  try{return compareProfiles(measureCanonicalMesh(e.geometry),target.front,target.side)}finally{e.geometry.dispose()}
}
export async function optimizeProfileFit(obj:string,seed:CharacterState,target:FitTarget,maxIterations=8){
  let current=seed,residual=await evaluate(obj,seed,target),best=seed,bestResidual=residual;
  const trace=[residual.total];let iterations=0;
  for(let i=0;i<maxIterations&&residual.valid>=4;i++){
    if(bestResidual.total<=.02)break;
    const gain=.34/Math.sqrt(i+1),morphs={...current.morphs};
    for(const key of FIT_KEYS){const d=Math.max(-.16,Math.min(.16,residualFor(key,residual)));morphs[key]=clamp(key,morphs[key]*(1+d*gain))}
    const trial={...current,morphs},trialResidual=await evaluate(obj,trial,target);iterations=i+1;trace.push(trialResidual.total);
    if(trialResidual.total+1e-5<bestResidual.total){current=trial;residual=trialResidual;best=trial;bestResidual=trialResidual}else break;
  }
  const patch:Partial<BodyMorphs>={};for(const key of FIT_KEYS)patch[key]=best.morphs[key];
  return {patch,report:{initialLoss:trace[0],bestLoss:bestResidual.total,iterations,converged:bestResidual.total<=.02,validTerms:bestResidual.valid,trace} satisfies FitReport};
}
export function syntheticTargetFromGeometry(geometry:BufferGeometry):FitTarget{
  const p=measureCanonicalMesh(geometry);
  return {front:{shoulderWidth:p.widthAt(.29),chestWidth:p.widthAt(.39),waistWidth:p.widthAt(.50),hipWidth:p.widthAt(.59)},side:{chestWidth:p.depthAt(.39),waistWidth:p.depthAt(.50),hipWidth:p.depthAt(.59)}};
}
