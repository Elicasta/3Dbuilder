import type { BodyMorphs } from './character';

export interface ViewAnalysis {
  width: number;
  height: number;
  foregroundConfidence: number;
  headWidth: number | null;
  shoulderWidth: number | null;
  chestWidth: number | null;
  waistWidth: number | null;
  hipWidth: number | null;
  kneeWidth: number | null;
  ankleWidth: number | null;
  legSplitY: number | null;
  armSpan: number | null;
}

export interface MultiViewAnalysis {
  front: ViewAnalysis | null;
  side: ViewAnalysis | null;
  back: ViewAnalysis | null;
  morphPatch: Partial<BodyMorphs>;
  confidence: number;
  fitQuality: number;
  notes: string[];
}
