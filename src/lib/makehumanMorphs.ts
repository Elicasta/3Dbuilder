import type { BodyMorphs } from '../types/character';
import type { MakeHumanTargetDelta } from './makehumanTarget';

export interface ResolvedMorphTarget {
  path: string;
  weight: number;
}

type Direction = { stems: string[]; span?: number };

const MORPH_TARGETS: Partial<Record<keyof BodyMorphs, Direction>> = {
  shoulders: { stems: ['torso/torso-vshape'] },
  chest: { stems: ['torso/torso-scale-horiz'] },
  chestDepth: { stems: ['torso/torso-scale-depth'] },
  hips: { stems: ['hip/hip-scale-horiz'] },
  hipDepth: { stems: ['hip/hip-scale-depth'] },
  torsoLength: { stems: ['torso/torso-scale-vert'] },
  neckLength: { stems: ['neck/neck-scale-vert'] },
  neckThickness: { stems: ['neck/neck-scale-horiz', 'neck/neck-scale-depth'] },
  headScale: { stems: ['head/head-scale-horiz', 'head/head-scale-vert', 'head/head-scale-depth'] },
  faceWidth: { stems: ['head/head-scale-horiz'] },
  faceDepth: { stems: ['head/head-scale-depth'] },
  jawHeight: { stems: ['chin/chin-height'] },
  chinWidth: { stems: ['chin/chin-width'] },
  chinProjection: { stems: ['chin/chin-prominent'] },
  cheekWidth: { stems: ['cheek/l-cheek-bones', 'cheek/r-cheek-bones'] },
  browHeight: { stems: ['eyebrows/eyebrows-trans'] },
  noseWidth: { stems: ['nose/nose-scale-horiz'] },
  noseLength: { stems: ['nose/nose-scale-vert'] },
  noseProjection: { stems: ['nose/nose-scale-depth'] },
  mouthWidth: { stems: ['mouth/mouth-scale-horiz'] },
  lipFullness: { stems: ['mouth/mouth-lowerlip-volume', 'mouth/mouth-upperlip-volume'] },
  earSize: { stems: ['ears/l-ear-scale', 'ears/r-ear-scale'] },
  eyeScale: { stems: ['eyes/l-eye-scale', 'eyes/r-eye-scale'] },
  eyeHeight: { stems: ['eyes/l-eye-height1', 'eyes/r-eye-height1'] },
  handSize: { stems: ['armslegs/l-hand-scale', 'armslegs/r-hand-scale'] },
  footSize: { stems: ['armslegs/l-foot-scale', 'armslegs/r-foot-scale'] },
  legLength: { stems: ['armslegs/l-upperleg-scale-vert', 'armslegs/r-upperleg-scale-vert'] },
  armLength: { stems: ['armslegs/l-upperarm-scale-vert', 'armslegs/r-upperarm-scale-vert', 'armslegs/l-lowerarm-scale-vert', 'armslegs/r-lowerarm-scale-vert'] },
  armThickness: { stems: ['armslegs/l-upperarm-scale-horiz', 'armslegs/r-upperarm-scale-horiz', 'armslegs/l-lowerarm-scale-horiz', 'armslegs/r-lowerarm-scale-horiz'] },
  legThickness: { stems: ['armslegs/l-upperleg-scale-horiz', 'armslegs/r-upperleg-scale-horiz', 'armslegs/l-lowerleg-scale-horiz', 'armslegs/r-lowerleg-scale-horiz'] }
};

function findDirectionalTarget(catalog: readonly string[], stem: string, positive: boolean): string | null {
  const suffix = positive ? '-incr.target' : '-decr.target';
  const normalized = stem.toLowerCase();
  return catalog.find((path) => {
    const value = path.toLowerCase();
    return value.endsWith(normalized + suffix) || value.endsWith('/' + normalized + suffix);
  }) ?? null;
}

export function resolveMakeHumanMorphTargets(
  morphs: BodyMorphs,
  catalog: readonly string[]
): ResolvedMorphTarget[] {
  const combined = new Map<string, number>();

  for (const [rawKey, direction] of Object.entries(MORPH_TARGETS)) {
    const key = rawKey as keyof BodyMorphs;
    const delta = morphs[key] - 1;
    if (Math.abs(delta) < 0.001 || !direction) continue;

    const positive = delta > 0;
    const weight = Math.min(1, Math.abs(delta) / (direction.span ?? 0.35));
    for (const stem of direction.stems) {
      const path = findDirectionalTarget(catalog, stem, positive);
      if (path) combined.set(path, Math.max(combined.get(path) ?? 0, weight));
    }
  }

  return [...combined].map(([path, weight]) => ({ path, weight }));
}

export function applyTargetDeltasInPlace(
  positions: Float32Array,
  deltas: readonly MakeHumanTargetDelta[],
  weight: number
) {
  for (const delta of deltas) {
    const index = delta.vertex * 3;
    if (index + 2 >= positions.length) continue;
    positions[index] += delta.x * weight;
    positions[index + 1] += delta.y * weight;
    positions[index + 2] += delta.z * weight;
  }
}
