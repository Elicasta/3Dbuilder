import type { BodyMorphs, CharacterReferences, CharacterState } from '../types/character';
import type { MultiViewAnalysis, ViewAnalysis } from '../types/multiview';
import { analyzeMultiView } from './multiview';
import { evaluateMakeHumanGeometry } from './makehumanCharacter';
import { compareProfiles, measureCanonicalMesh, type ProfileResidual } from './meshProfile';

export interface ReconstructionObservation {
  view:'front'|'side'|'back';
  silhouette:Pick<ViewAnalysis,'headWidth'|'shoulderWidth'|'chestWidth'|'waistWidth'|'hipWidth'|'kneeWidth'|'ankleWidth'|'armSpan'|'legSplitY'|'silhouetteSymmetry'>;
  confidence:number;
}
export interface OptimizationReport {
  initialLoss:number;
  bestLoss:number;
  iterations:number;
  converged:boolean;
  validTerms:number;
}
export interface IdentityFit {
  version:2;
  referenceCount:number;
  observations:ReconstructionObservation[];
  macroPatch:Partial<CharacterState['macro']>;
  morphPatch:Partial<BodyMorphs>;
  objective:{observation:number;crossView:number;confidence:number;model:number;total:number};
  optimization:OptimizationReport|null;
  analysis:MultiViewAnalysis;
}
const OPT_KEYS=['shoulders','chest','waist','hips','chestDepth','hipDepth'] as const;
type OptKey=typeof OPT_KEYS[number];
const LIMITS:Record<OptKey,[number,number]>={
  shoulders:[.82,1.18],chest:[.80,1.20],waist:[.80,1.20],hips:[.80,1.20],
  chestDepth:[.78,1.22],hipDepth:[.78,1.22]
};
function clampKey(key:OptKey,value:number){const [lo,hi]=LIMITS[key];return Math.max(lo,Math.min(hi,value));}
function observation(view:'front'|'side'|'back',v:ViewAnalysis):ReconstructionObservation{
  return {view,silhouette:{headWidth:v.headWidth,shoulderWidth:v.shoulderWidth,chestWidth:v.chestWidth,waistWidth:v.waistWidth,hipWidth:v.hipWidth,kneeWidth:v.kneeWidth,ankleWidth:v.ankleWidth,armSpan:v.armSpan,legSplitY:v.legSplitY,silhouetteSymmetry:v.silhouetteSymmetry},confidence:v.foregroundConfidence};
}
function agreement(a:number|null,b:number|null){
  if(a===null||b===null)return null;
  return Math.max(0,Math.min(1,1-Math.abs(a-b)/Math.max(Math.abs(a),Math.abs(b),.001)));
}
function crossViewLoss(analysis:MultiViewAnalysis){
  if(!analysis.front||!analysis.back)return .25;
  const keys=(['headWidth','shoulderWidth','chestWidth','waistWidth','hipWidth'] as const);
  const values=keys.map(k=>agreement(analysis.front![k],analysis.back![k])).filter((v):v is number=>v!==null);
  return values.length?1-values.reduce((a,b)=>a+b,0)/values.length:.25;
}
async function modelResidual(obj:string,character:CharacterState,analysis:MultiViewAnalysis){
  const evaluated=await evaluateMakeHumanGeometry(obj,character);
  try{return compareProfiles(measureCanonicalMesh(evaluated.geometry),analysis.front,analysis.side);}
  finally{evaluated.geometry.dispose();}
}
function correctionFor(key:OptKey,r:ProfileResidual){
  const map:Record<OptKey,number>={shoulders:r.shoulder,chest:r.chest,waist:r.waist,hips:r.hip,chestDepth:r.chestDepth,hipDepth:r.hipDepth};
  return map[key];
}
async function optimizeBody(obj:string,seed:CharacterState,analysis:MultiViewAnalysis){
  let current=seed;
  let residual=await modelResidual(obj,current,analysis);
  const initialLoss=residual.total;
  let best=current,bestResidual=residual;
  let iterations=0;
  for(let i=0;i<6&&residual.valid>=4;i++){
    if(bestResidual.total<=.025)break;
    const gain=.28/Math.sqrt(i+1);
    const morphs={...current.morphs};
    for(const key of OPT_KEYS){
      const delta=correctionFor(key,residual);
      morphs[key]=clampKey(key,morphs[key]*(1+Math.max(-.12,Math.min(.12,delta))*gain));
    }
    const trial={...current,morphs};
    const trialResidual=await modelResidual(obj,trial,analysis);
    iterations=i+1;
    if(trialResidual.total+1e-4<bestResidual.total){
      best=trial;bestResidual=trialResidual;current=trial;residual=trialResidual;
    }else break;
  }
  const patch:Partial<BodyMorphs>={};
  for(const key of OPT_KEYS)patch[key]=best.morphs[key];
  return {patch,report:{initialLoss,bestLoss:bestResidual.total,iterations,converged:bestResidual.total<=.025,validTerms:bestResidual.valid}};
}
export async function solveIdentityFromReferences(references:CharacterReferences,baseObjText?:string,seedCharacter?:CharacterState):Promise<IdentityFit>{
  const analysis=await analyzeMultiView(references);
  const observations:ReconstructionObservation[]=[];
  if(analysis.front)observations.push(observation('front',analysis.front));
  if(analysis.side)observations.push(observation('side',analysis.side));
  if(analysis.back)observations.push(observation('back',analysis.back));
  const macroPatch:Partial<CharacterState['macro']>={};
  const build=analysis.morphPatch.build;
  if(typeof build==='number')macroPatch.weight=Math.max(0,Math.min(1,(build-.78)/.44));
  let morphPatch={...analysis.morphPatch};
  let optimization:OptimizationReport|null=null;
  let modelLoss=.35;
  if(baseObjText&&seedCharacter){
    const seed={...seedCharacter,macro:{...seedCharacter.macro,...macroPatch},morphs:{...seedCharacter.morphs,...morphPatch}};
    const optimized=await optimizeBody(baseObjText,seed,analysis);
    morphPatch={...morphPatch,...optimized.patch};
    optimization=optimized.report;modelLoss=optimized.report.bestLoss;
  }
  const observationLoss=1-analysis.fitQuality;
  const crossView=crossViewLoss(analysis);
  const confidence=analysis.confidence;
  return {version:2,referenceCount:observations.length,observations,macroPatch,morphPatch,optimization,analysis,
    objective:{observation:observationLoss,crossView,confidence,model:modelLoss,total:observationLoss*.20+crossView*.15+modelLoss*.55+(1-confidence)*.10}};
}
export function applyIdentityFit(character:CharacterState,fit:IdentityFit):CharacterState{
  return {...character,macro:{...character.macro,...fit.macroPatch},morphs:{...character.morphs,...fit.morphPatch}};
}
