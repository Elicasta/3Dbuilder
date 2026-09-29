import type { BodyMorphs, CharacterLane, MakeHumanMacroState } from '../types/character';

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
  faceWidth: { stems: ['head/head-scale-horiz'] },
  faceDepth: { stems: ['head/head-scale-depth'] },
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

export function makeHumanAgeWeights(age: number): DiscreteWeight[] {
  const value = Math.max(0, Math.min(1, age));
  if (value < 0.5) {
    const baby = Math.max(0, 1 - value * 5.3333333333);
    const young = Math.max(0, (value - 0.1875) * 3.2);
    const child = Math.max(0, Math.min(1, 5.3333333333 * value) - young);
    return [
      { value: 'baby', weight: baby },
      { value: 'child', weight: child },
      { value: 'young', weight: young }
    ].filter((entry) => entry.weight > 0.0001);
  }
  const old = Math.max(0, value * 2 - 1);
  return [
    { value: 'young', weight: 1 - old },
    { value: 'old', weight: old }
  ].filter((entry) => entry.weight > 0.0001);
}

export function resolveMakeHumanMacroTargets(
  lane: CharacterLane,
  morphs: BodyMorphs,
  catalog: readonly string[],
  macro?: MakeHumanMacroState
): ResolvedMorphTarget[] {
  if (lane === 'alien') return [];
  const sex = lane === 'female' ? 'female' : 'male';
  const phenotype = macro ?? {
    age: 0.5, muscle: 0.5, weight: 0.5, proportions: 0.5,
    breastSize: 0.5, breastFirmness: 0.5,
    african: 1 / 3, asian: 1 / 3, caucasian: 1 / 3
  };
  const result = new Map<string, number>();
  const add = (relative: string, weight: number) => {
    if (weight <= 0.0001) return;
    const path = exact(catalog, relative);
    if (path) result.set(path, (result.get(path) ?? 0) + weight);
  };

  const ages = makeHumanAgeWeights(phenotype.age);
  const muscles = triangle(phenotype.muscle, 'minmuscle', 'averagemuscle', 'maxmuscle');
  const weights = triangle(phenotype.weight, 'minweight', 'averageweight', 'maxweight');
  const height01 = Math.max(0, Math.min(1, (morphs.height - 0.78) / 0.46));
  const heights = triangle(height01, 'minheight', 'averageheight', 'maxheight');
  const ideal = Math.max(0, phenotype.proportions * 2 - 1);
  const uncommon = Math.max(0, 1 - phenotype.proportions * 2);
  const cups = triangle(phenotype.breastSize, 'mincup', 'averagecup', 'maxcup');
  const firmness = triangle(phenotype.breastFirmness, 'minfirmness', 'averagefirmness', 'maxfirmness');
  const raceTotal = Math.max(0.0001, phenotype.african + phenotype.asian + phenotype.caucasian);
  const races = [
    ['caucasian', phenotype.caucasian / raceTotal],
    ['asian', phenotype.asian / raceTotal],
    ['african', phenotype.african / raceTotal]
  ] as const;

  for (const age of ages) {
    for (const [race, raceWeight] of races) {
      add(`macrodetails/${race}-${sex}-${age.value}.target`, age.weight * raceWeight);
    }
    for (const muscle of muscles) {
      for (const weight of weights) {
        const dependency = age.weight * muscle.weight * weight.weight;
        add(
          `macrodetails/universal-${sex}-${age.value}-${muscle.value}-${weight.value}.target`,
          dependency
        );
        for (const height of heights) {
          if (height.value !== 'averageheight') {
            add(
              `macrodetails/height/${sex}-${age.value}-${muscle.value}-${weight.value}-${height.value}.target`,
              dependency * height.weight
            );
          }
        }
        if (ideal > 0.0001) {
          add(
            `macrodetails/proportions/${sex}-${age.value}-${muscle.value}-${weight.value}-idealproportions.target`,
            dependency * ideal
          );
        }
        if (uncommon > 0.0001) {
          add(
            `macrodetails/proportions/${sex}-${age.value}-${muscle.value}-${weight.value}-uncommonproportions.target`,
            dependency * uncommon
          );
        }
      }
    }
  }


  if (sex === 'female') {
    for (const age of ages) {
      for (const muscle of muscles) {
        for (const weight of weights) {
          for (const cup of cups) {
            for (const firm of firmness) {
              if (cup.value === 'averagecup' && firm.value === 'averagefirmness') continue;
              add(
                `breast/female-${age.value}-${muscle.value}-${weight.value}-${cup.value}-${firm.value}.target`,
                age.weight * muscle.weight * weight.weight * cup.weight * firm.weight
              );
            }
          }
        }
      }
    }
  }

  return [...result].map(([path, weight]) => ({ path, weight }));
}

export function inspectMakeHumanMacroResolution(
  lane: CharacterLane,
  morphs: BodyMorphs,
  catalog: readonly string[],
  macro?: MakeHumanMacroState
) {
  const targets=resolveMakeHumanMacroTargets(lane,morphs,catalog,macro);
  const sex=lane==='female'?'female':lane==='male'?'male':null;
  const sexTargets=sex?targets.filter(t=>t.path.toLowerCase().includes(`-${sex}-`)):[];
  return {
    resolved:targets.length,
    sexResolved:sexTargets.length,
    hasSexBasis:lane==='alien'||sexTargets.length>0,
    sample:targets.slice(0,8).map(t=>t.path)
  };
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
