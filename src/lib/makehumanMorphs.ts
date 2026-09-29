import type { BodyMorphs, CharacterLane } from '../types/character';

export interface ResolvedMorphTarget {
  path: string;
  weight: number;
}

type ModifierSpec = {
  stems: string[];
  negative?: string;
  positive?: string;
  span?: number;
};

/**
 * Builder controls mapped only to modifier definitions that exist in MakeHuman.
 * Values are centered on 1.0 in our UI and converted to MakeHuman's -1..1
 * UniversalModifier value. No fuzzy filename matching is allowed.
 */
const MODIFIERS: Partial<Record<keyof BodyMorphs, ModifierSpec>> = {
  shoulders: { stems: ['measure/measure-shoulder-dist'] },
  chest: { stems: ['torso/torso-scale-horiz'] },
  chestDepth: { stems: ['torso/torso-scale-depth'] },
  waist: { stems: ['measure/measure-waist-circ'] },
  hips: { stems: ['hip/hip-scale-horiz'] },
  hipDepth: { stems: ['hip/hip-scale-depth'] },
  torsoLength: { stems: ['torso/torso-scale-vert'] },
  armLength: {
    stems: ['measure/measure-upperarm-length', 'measure/measure-lowerarm-length']
  },
  armThickness: {
    stems: [
      'armslegs/l-upperarm-scale-horiz','armslegs/r-upperarm-scale-horiz',
      'armslegs/l-lowerarm-scale-horiz','armslegs/r-lowerarm-scale-horiz'
    ]
  },
  legLength: {
    stems: ['armslegs/upperlegs-height', 'armslegs/lowerlegs-height']
  },
  legThickness: {
    stems: [
      'armslegs/l-upperleg-scale-horiz', 'armslegs/r-upperleg-scale-horiz',
      'armslegs/l-lowerleg-scale-horiz', 'armslegs/r-lowerleg-scale-horiz'
    ]
  },
  neckLength: { stems: ['measure/measure-neck-height'] },
  neckThickness: { stems: ['measure/measure-neck-circ'] },
  headScale: { stems: ['head/head-scale-vert', 'head/head-scale-horiz', 'head/head-scale-depth'] },
  faceWidth: { stems: ['head/head-scale-horiz'] },
  faceDepth: { stems: ['head/head-scale-depth'] },
  craniumScale: { stems: ['head/head-scale-horiz', 'head/head-scale-vert'] },
  jawWidth: { stems: ['chin/chin-width'] },
  jawHeight: { stems: ['chin/chin-height'] },
  chinProjection: { stems: ['chin/chin-prominent'] },
  cheekWidth: { stems: ['cheek/l-cheek-bones', 'cheek/r-cheek-bones'] },
  eyeScale: { stems: ['eyes/l-eye-scale', 'eyes/r-eye-scale'] },
  eyeSpacing: {
    stems: ['eyes/l-eye-trans', 'eyes/r-eye-trans'],
    negative: 'in',
    positive: 'out'
  },
  browHeight: {
    stems: ['eyebrows/eyebrows-trans'],
    negative: 'down',
    positive: 'up'
  },
  noseWidth: { stems: ['nose/nose-scale-horiz'] },
  noseLength: { stems: ['nose/nose-scale-vert'] },
  noseProjection: { stems: ['nose/nose-scale-depth'] },
  mouthWidth: { stems: ['mouth/mouth-scale-horiz'] },
  mouthHeight: { stems: ['mouth/mouth-scale-vert'] },
  lipFullness: {
    stems: ['mouth/mouth-upperlip-volume', 'mouth/mouth-lowerlip-volume']
  },
  earSize: { stems: ['ears/l-ear-scale', 'ears/r-ear-scale'] },
  handSize: { stems: ['armslegs/l-hand-scale', 'armslegs/r-hand-scale'] },
  footSize: { stems: ['armslegs/l-foot-scale', 'armslegs/r-foot-scale'] },
  bust: { stems: ['breast/breast-dist'] },
  bustProjection: { stems: ['breast/breast-point'] }
};

function exact(catalog: readonly string[], path: string) {
  const wanted = path.toLowerCase();
  return catalog.find((entry) => entry.toLowerCase() === wanted) ?? null;
}

function universalValue(value: number, span = 0.45) {
  return Math.max(-1, Math.min(1, (value - 1) / span));
}

function resolveUniversal(
  catalog: readonly string[],
  spec: ModifierSpec,
  value: number
): ResolvedMorphTarget[] {
  const modifier = universalValue(value, spec.span);
  if (Math.abs(modifier) < 0.0001) return [];
  const positive = modifier > 0;
  const suffix = positive ? (spec.positive ?? 'incr') : (spec.negative ?? 'decr');
  const weight = Math.abs(modifier);
  return spec.stems.flatMap((stem) => {
    const path = exact(catalog, `${stem}-${suffix}.target`);
    return path ? [{ path, weight }] : [];
  });
}

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
    const path = exact(catalog, relative);
    if (path) result.set(path, (result.get(path) ?? 0) + weight);
  };

  for (const race of ['caucasian', 'asian', 'african']) {
    add(`macrodetails/${race}-${sex}-young.target`, 1 / 3);
  }

  const build01 = Math.max(0, Math.min(1, (morphs.build - 0.68) / 0.70));
  const muscles = triangle(build01, 'minmuscle', 'averagemuscle', 'maxmuscle');
  const weights = triangle(build01, 'minweight', 'averageweight', 'maxweight');
  const height01 = Math.max(0, Math.min(1, (morphs.height - 0.78) / 0.46));
  const heights = triangle(height01, 'minheight', 'averageheight', 'maxheight');

  for (const muscle of muscles) {
    for (const weight of weights) {
      const bodyBlend = muscle.weight * weight.weight;
      add(
        `macrodetails/universal-${sex}-young-${muscle.value}-${weight.value}.target`,
        bodyBlend
      );
      for (const height of heights) {
        // Average height is represented by absence of a height delta. Only one
        // side of the height macro is active at a time.
        if (height.value !== 'averageheight') {
          add(
            `macrodetails/height/${sex}-young-${muscle.value}-${weight.value}-${height.value}.target`,
            bodyBlend * height.weight
          );
        }
      }
    }
  }

  return [...result].map(([path, weight]) => ({ path, weight }));
}

export function resolveMakeHumanMorphTargets(
  morphs: BodyMorphs,
  catalog: readonly string[]
): ResolvedMorphTarget[] {
  const result = new Map<string, number>();
  for (const [key, spec] of Object.entries(MODIFIERS) as [keyof BodyMorphs, ModifierSpec][]) {
    const value = morphs[key];
    if (typeof value !== 'number') continue;
    for (const target of resolveUniversal(catalog, spec, value)) {
      result.set(target.path, (result.get(target.path) ?? 0) + target.weight);
    }
  }
  return [...result].map(([path, weight]) => ({ path, weight }));
}

export function applyTargetDeltasInPlace(
  positions: Float32Array,
  deltas: readonly { vertex: number; x: number; y: number; z: number }[],
  weight: number
) {
  for (const delta of deltas) {
    const i = delta.vertex * 3;
    if (i + 2 >= positions.length) continue;
    positions[i] += delta.x * weight;
    positions[i + 1] += delta.y * weight;
    positions[i + 2] += delta.z * weight;
  }
}
