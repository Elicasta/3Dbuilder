import type { BodyMorphs, CharacterReferences, CharacterState } from '../types/character';
import type { MultiViewAnalysis, ViewAnalysis } from '../types/multiview';
import { analyzeMultiView } from './multiview';

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
export async function solveIdentityFromReferences(references: CharacterReferences): Promise<IdentityFit> {
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
