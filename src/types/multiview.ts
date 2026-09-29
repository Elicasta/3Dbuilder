import type { BodyMorphs } from './character';

export interface ViewAnalysis {
  width: number;
  height: number;
  foregroundConfidence: number;
  headWidth: number | null;
  chestWidth: number | null;
  waistWidth: number | null;
  hipWidth: number | null;
  legSplitY: number | null;
  armSpan: number | null;
}

export interface MultiViewAnalysis {
  front: ViewAnalysis | null;
  side: ViewAnalysis | null;
  back: ViewAnalysis | null;
  morphPatch: Partial<BodyMorphs>;
  confidence: number;
  notes: string[];
}
