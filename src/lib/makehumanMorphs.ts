import type { BodyMorphs, CharacterLane } from '../types/character';
import type { MakeHumanTargetDelta } from './makehumanTarget';

export interface ResolvedMorphTarget {
  path: string;
  weight: number;
}

type Direction = { stems: string[]; span?: number; negative?: string; positive?: string };

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
  craniumScale: { stems: ['head/head-scale-horiz', 'head/head-scale-vert'] },
  jawWidth: { stems: ['chin/chin-width'] },
  jawHeight: { stems: ['chin/chin-height'] },
  chinWidth: { stems: ['chin/chin-width'] },
  chinProjection: { stems: ['chin/chin-prominent'] },
  cheekWidth: { stems: ['cheek/l-cheek-bones', 'cheek/r-cheek-bones'] },
  eyeSpacing: { stems: ['eyes/l-eye-trans', 'eyes/r-eye-trans'], negative: 'in', positive: 'out' },
  browHeight: { stems: ['eyebrows/eyebrows-trans'], negative: 'down', positive: 'up' },
  noseWidth: { stems: ['nose/nose-scale-horiz'] },
  noseLength: { stems: ['nose/nose-scale-vert'] },
  noseProjection: { stems: ['nose/nose-scale-depth'] },
  mouthWidth: { stems: ['mouth/mouth-scale-horiz'] },
  lipFullness: { stems: ['mouth/mouth-lowerlip-volume', 'mouth/mouth-upperlip-volume'] },
  earSize: { stems: ['ears/l-ear-scale', 'ears/r-ear-scale'] },
  bust: { stems: ['breast/breast-dist'] },
  bustProjection: { stems: ['breast/breast-point'] },
  eyeScale: { stems: ['eyes/l-eye-scale', 'eyes/r-eye-scale'] },
  eyeHeight: { stems: ['eyes/l-eye-height1', 'eyes/r-eye-height1'] },
  handSize: { stems: ['armslegs/l-hand-scale', 'armslegs/r-hand-scale'] },
  footSize: { stems: ['armslegs/l-foot-scale', 'armslegs/r-foot-scale'] },
  legLength: { stems: ['armslegs/l-upperleg-scale-vert', 'armslegs/r-upperleg-scale-vert'] },
  armLength: { stems: ['armslegs/l-upperarm-scale-vert', 'armslegs/r-upperarm-scale-vert', 'armslegs/l-lowerarm-scale-vert', 'armslegs/r-lowerarm-scale-vert'] },
  armThickness: { stems: ['armslegs/l-upperarm-scale-horiz', 'armslegs/r-upperarm-scale-horiz', 'armslegs/l-lowerarm-scale-horiz', 'armslegs/r-lowerarm-scale-horiz'] },
  legThickness: { stems: ['armslegs/l-upperleg-scale-horiz', 'armslegs/r-upperleg-scale-horiz', 'armslegs/l-lowerleg-scale-horiz', 'armslegs/r-lowerleg-scale-horiz'] }
};


type DiscreteWeight = { value: string; weight: number };

function triangle(value: number, low: string, mid: string, high: string): DiscreteWeight[] {
  const v = Math.max(0, Math.min(1, value));
  if (v <= 0.5) {
    return [
      { value: low, weight: 1 - v * 2 },
      { value: mid, weight: v * 2 }
    ].filter((entry) => entry.weight > 0.0001);
  }
  return [
    { value: mid, weight: (1 - v) * 2 },
    { value: high, weight: (v - 0.5) * 2 }
  ].filter((entry) => entry.weight > 0.0001);
}

function exactCatalogPath(catalog: readonly string[], relative: string): string | null {
  const wanted = relative.toLowerCase();
  return catalog.find((path) => path.toLowerCase() === wanted) ?? null;
}

/**
 * Resolve MakeHuman's native macro target blend for an adult character.
 * The neutral hm08 OBJ is pre-morph. A production character therefore needs
 * macrodetails (sex/race/age) plus universal weight/muscle targets before local
 * modeling targets are layered on top.
 */
export function resolveMakeHumanMacroTargets(
  lane: CharacterLane,
  morphs: BodyMorphs,
  catalog: readonly string[]
): ResolvedMorphTarget[] {
  if (lane === 'alien') return [];

  const sex = lane === 'female' ? 'female' : 'male';
  const result = new Map<string, number>();
  const add = (relative: string, weight: number) => {
    if (weight <= 0.0001) return;
    const path = exactCatalogPath(catalog, relative);
    if (path) result.set(path, (result.get(path) ?? 0) + weight);
  };

  // MakeHuman's default ethnicity is the equal blend of its three macro races.
  for (const race of ['caucasian', 'asian', 'african']) {
    add(`macrodetails/${race}-${sex}-young.target`, 1 / 3);
  }

  // "Build" is our compact UI control for MakeHuman's weight + muscle pair.
  // 1.0 is neutral, the profile range maps to the complete MakeHuman macro span.
  const build01 = Math.max(0, Math.min(1, (morphs.build - 0.68) / (1.38 - 0.68)));
  const muscles = triangle(build01, 'minmuscle', 'averagemuscle', 'maxmuscle');
  const weights = triangle(build01, 'minweight', 'averageweight', 'maxweight');

  for (const muscle of muscles) {
    for (const weight of weights) {
      const blend = muscle.weight * weight.weight;
      add(`macrodetails/universal-${sex}-young-${muscle.value}-${weight.value}.target`, blend);

      // Height and proportions are dependency-aware MakeHuman macro targets.
      const height01 = Math.max(0, Math.min(1, (morphs.height - 0.78) / (1.24 - 0.78)));
      const height = triangle(height01, 'minheight', 'averageheight', 'maxheight');
      for (const h of height) {
        if (h.value !== 'averageheight') {
          add(`macrodetails/height/${sex}-young-${muscle.value}-${weight.value}-${h.value}.target`, blend * h.weight);
        }
      }

      // Keep neutral regular proportions at 1.0. Torso/limb sliders provide
      // explicit proportion editing rather than silently changing this macro.
    }
  }

  return [...result].map(([path, weight]) => ({ path, weight }));
}

function findDirectionalTarget(
  catalog: readonly string[],
  stem: string,
  positive: boolean,
  negativeSuffix = 'decr',
  positiveSuffix = 'incr'
): string | null {
  const suffix = '-' + (positive ? positiveSuffix : negativeSuffix) + '.target';
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
      const path = findDirectionalTarget(catalog, stem, positive, direction.negative, direction.positive);
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
