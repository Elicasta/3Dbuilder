import type { BodyMorphs, CharacterReferences, CharacterState } from '../types/character';
import type { MultiViewAnalysis, ViewAnalysis } from '../types/multiview';
import { analyzeMultiView } from './multiview';
import { evaluateMakeHumanGeometry } from './makehumanCharacter';
import { compareProfiles, measureCanonicalMesh } from './meshProfile';

export interface ReconstructionObservation {
  view: 'front' | 'side' | 'back';
  silhouette: Pick<ViewAnalysis,
    'headWidth'|'shoulderWidth'|'chestWidth'|'waistWidth'|'hipWidth'|'kneeWidth'|'ankleWidth'|'armSpan'|'legSplitY'|'silhouetteSymmetry'>;
  confidence: number;
}

export interface IdentityFit {
  version: 1;
  referenceCount: number;
  observations: ReconstructionObservation[];
  macroPatch: Partial<CharacterState['macro']>;
  morphPatch: Partial<BodyMorphs>;
  objective: {
    silhouette: number;
    crossView: number;
    confidence: number;
    total: number;
  };
  analysis: MultiViewAnalysis;
}

/**
 * Stage-1 identity fit. This deliberately produces one shared editable identity
 * from every supplied view. Neural reconstruction providers are later priors,
 * not alternate character state.
 */
export async function solveIdentityFromReferences(references: CharacterReferences, baseObjText?: string, seedCharacter?: CharacterState): Promise<IdentityFit> {
  const analysis=await analyzeMultiView(references);
  const entries=(['front','side','back'] as const)
    .map((view)=>[view,view === 'front' ? analysis.front : view === 'side' ? analysis.side : analysis.back] as const)
    .filter((entry): entry is [typeof entry[0],ViewAnalysis]=>Boolean(entry[1]));
  const observations=entries.map(([view,value])=>({
    view,
    silhouette:{
      headWidth:value.headWidth, shoulderWidth:value.shoulderWidth, chestWidth:value.chestWidth,
      waistWidth:value.waistWidth, hipWidth:value.hipWidth, kneeWidth:value.kneeWidth,
      ankleWidth:value.ankleWidth, armSpan:value.armSpan, legSplitY:value.legSplitY,
      silhouetteSymmetry:value.silhouetteSymmetry
    },
    confidence:value.foregroundConfidence
  }));

  const build=analysis.morphPatch.build;
  const macroPatch:Partial<CharacterState['macro']>={};
  if(typeof build==='number') macroPatch.weight=Math.max(0,Math.min(1,(build-.78)/.44));

  const silhouette=1-analysis.fitQuality;
  const crossView=1-analysis.fitQuality;
  const confidence=analysis.confidence;

  if(baseObjText && seedCharacter){
    let candidate:CharacterState={...seedCharacter,macro:{...seedCharacter.macro,...macroPatch},morphs:{...seedCharacter.morphs,...analysis.morphPatch}};
    for(let iteration=0;iteration<4;iteration++){
      const evaluated=await evaluateMakeHumanGeometry(baseObjText,candidate);
      const residual=compareProfiles(measureCanonicalMesh(evaluated.geometry),analysis.front,analysis.side);
      evaluated.geometry.dispose();
      if(residual.total<.035)break;
      const gain=.42;
      const next={...candidate.morphs};
      next.shoulders=Math.max(.82,Math.min(1.18,next.shoulders*(1+residual.shoulder*gain)));
      next.chest=Math.max(.80,Math.min(1.20,next.chest*(1+residual.chest*gain)));
      next.waist=Math.max(.80,Math.min(1.20,next.waist*(1+residual.waist*gain)));
      next.hips=Math.max(.80,Math.min(1.20,next.hips*(1+residual.hip*gain)));
      next.chestDepth=Math.max(.78,Math.min(1.22,next.chestDepth*(1+residual.chestDepth*gain)));
      next.hipDepth=Math.max(.78,Math.min(1.22,next.hipDepth*(1+residual.hipDepth*gain)));
      candidate={...candidate,morphs:next};
    }
    Object.assign(analysis.morphPatch,candidate.morphs);
  }
  return {
    version:1,
    referenceCount:observations.length,
    observations,
    macroPatch,
    morphPatch:analysis.morphPatch,
    objective:{
      silhouette,
      crossView,
      confidence,
      total:silhouette*.55+crossView*.35+(1-confidence)*.10
    },
    analysis
  };
}

export function applyIdentityFit(character:CharacterState,fit:IdentityFit):CharacterState{
  return {
    ...character,
    macro:{...character.macro,...fit.macroPatch},
    morphs:{...character.morphs,...fit.morphPatch}
  };
}
