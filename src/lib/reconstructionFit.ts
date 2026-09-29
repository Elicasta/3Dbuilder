import type { BodyMorphs, CharacterReferences, CharacterState } from '../types/character';
import type { MultiViewAnalysis, ViewAnalysis } from '../types/multiview';
import { analyzeMultiView } from './multiview';
import { optimizeProfileFit, type FitReport } from './profileOptimizer';

export interface ReconstructionObservation {
  view:'front'|'side'|'back';
  silhouette:Pick<ViewAnalysis,'headWidth'|'shoulderWidth'|'chestWidth'|'waistWidth'|'hipWidth'|'kneeWidth'|'ankleWidth'|'armSpan'|'legSplitY'|'silhouetteSymmetry'>;
  confidence:number;
}
export type OptimizationReport = FitReport;
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
export async function solveIdentityFromReferences(references:CharacterReferences,baseObjText?:string,seedCharacter?:CharacterState):Promise<IdentityFit>{
  // The authoritative build must always return a usable editable character.
  // Start from deterministic silhouette evidence; landmark refinement is optional.
  const analysis=await analyzeMultiView(references,{landmarks:false});
  return solveIdentityFromAnalysis(analysis,baseObjText,seedCharacter);
}

export async function solveIdentityFromAnalysis(analysis:MultiViewAnalysis,baseObjText?:string,seedCharacter?:CharacterState):Promise<IdentityFit>{
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
    let timer:ReturnType<typeof globalThis.setTimeout>|undefined;
    try{
      const optimized=await Promise.race([
        optimizeProfileFit(baseObjText,seed,{front:analysis.front,side:analysis.side}),
        new Promise<never>((_,reject)=>{
          timer=globalThis.setTimeout(()=>reject(new Error('Profile optimizer timed out')),15000);
        })
      ]);
      morphPatch={...morphPatch,...optimized.patch};
      optimization=optimized.report;modelLoss=optimized.report.bestLoss;
    }catch{
      // Silhouette measurements are already a valid editable fit. Refinement
      // must never prevent Build Character from completing.
      optimization=null;modelLoss=.25;
    }finally{
      if(timer!==undefined)globalThis.clearTimeout(timer);
    }
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
