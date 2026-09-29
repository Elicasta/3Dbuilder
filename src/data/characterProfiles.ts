import {
  BASE_MORPHS,
  type AppearanceState,
  type BodyMorphs,
  type CharacterLane,
  type CharacterState,
  type CharacterStyle
} from '../types/character';

export interface MorphControl {
  key: keyof BodyMorphs;
  label: string;
  min: number;
  max: number;
  step?: number;
}

const SHARED: MorphControl[] = [
  { key: 'height', label: 'Height', min: 0.78, max: 1.24 },
  { key: 'build', label: 'Build', min: 0.68, max: 1.38 },
  { key: 'shoulders', label: 'Shoulders', min: 0.72, max: 1.36 },
  { key: 'chest', label: 'Chest width', min: 0.72, max: 1.34 },
  { key: 'chestDepth', label: 'Chest depth', min: 0.7, max: 1.35 },
  { key: 'waist', label: 'Waist width', min: 0.68, max: 1.34 },
  { key: 'waistDepth', label: 'Waist depth', min: 0.7, max: 1.35 },
  { key: 'hips', label: 'Hip width', min: 0.72, max: 1.36 },
  { key: 'hipDepth', label: 'Hip depth', min: 0.7, max: 1.35 },
  { key: 'torsoLength', label: 'Torso length', min: 0.82, max: 1.2 },
  { key: 'armLength', label: 'Arm length', min: 0.82, max: 1.22 },
  { key: 'armThickness', label: 'Arm thickness', min: 0.68, max: 1.38 },
  { key: 'legLength', label: 'Leg length', min: 0.8, max: 1.24 },
  { key: 'legThickness', label: 'Leg thickness', min: 0.68, max: 1.38 },
  { key: 'handSize', label: 'Hand size', min: 0.78, max: 1.28 },
  { key: 'footSize', label: 'Foot size', min: 0.78, max: 1.28 },
  { key: 'neckLength', label: 'Neck length', min: 0.72, max: 1.35 },
  { key: 'neckThickness', label: 'Neck thickness', min: 0.7, max: 1.34 },
  { key: 'headScale', label: 'Head scale', min: 0.78, max: 1.28 }
];

export const MORPH_CONTROLS: Record<CharacterLane, MorphControl[]> = {
  male: [
    ...SHARED,
    { key: 'jawWidth', label: 'Jaw width', min: 0.76, max: 1.28 },
    { key: 'craniumScale', label: 'Cranium', min: 0.86, max: 1.18 },
    { key: 'eyeScale', label: 'Eye size', min: 0.84, max: 1.2 }
  ],
  female: [
    ...SHARED,
    { key: 'bust', label: 'Bust width', min: 0.72, max: 1.4 },
    { key: 'bustProjection', label: 'Bust projection', min: 0.65, max: 1.5 },
    { key: 'jawWidth', label: 'Jaw width', min: 0.72, max: 1.2 },
    { key: 'craniumScale', label: 'Cranium', min: 0.86, max: 1.18 },
    { key: 'eyeScale', label: 'Eye size', min: 0.86, max: 1.22 }
  ],
  alien: [
    ...SHARED,
    { key: 'craniumScale', label: 'Cranium', min: 0.9, max: 1.85 },
    { key: 'eyeScale', label: 'Eye size', min: 0.8, max: 2.1 },
    { key: 'jawWidth', label: 'Jaw width', min: 0.55, max: 1.4 }
  ]
};

const LANE_MORPHS: Record<CharacterLane, Partial<BodyMorphs>> = {
  male: {
    shoulders: 1.08,
    chest: 1.07,
    hips: 0.96,
    jawWidth: 1.05,
    craniumScale: 1
  },
  female: {
    shoulders: 0.96,
    chest: 0.98,
    waist: 0.9,
    hips: 1.08,
    hipDepth: 1.06,
    jawWidth: 0.94,
    bust: 1.06,
    bustProjection: 1.08
  },
  alien: {
    height: 1.06,
    shoulders: 0.92,
    chest: 0.9,
    waist: 0.82,
    hips: 0.9,
    armLength: 1.12,
    legLength: 1.12,
    neckLength: 1.18,
    neckThickness: 0.84,
    headScale: 1.2,
    craniumScale: 1.3,
    jawWidth: 0.82,
    eyeScale: 1.48
  }
};

const LANE_APPEARANCE: Record<CharacterLane, Partial<AppearanceState>> = {
  male: {
    skin: '#9a6248',
    skinSecondary: '#7d4c39',
    eyes: '#5c4938',
    sclera: '#eee9df',
    hair: '#17120f',
    brows: '#211813',
    lips: '#8f5148',
    markingsOpacity: 0,
    hairEnabled: true
  },
  female: {
    skin: '#b97b60',
    skinSecondary: '#915a47',
    eyes: '#5a4a3f',
    sclera: '#f1ece5',
    hair: '#281b18',
    brows: '#34221d',
    lips: '#a85d63',
    markingsOpacity: 0,
    hairEnabled: true
  },
  alien: {
    skin: '#729c83',
    skinSecondary: '#466c5a',
    eyes: '#d5f4ff',
    sclera: '#172d35',
    hair: '#1d2730',
    brows: '#25363e',
    lips: '#547564',
    markings: '#243e52',
    markingsOpacity: 0.35,
    hairEnabled: false,
    skinRoughness: 0.48,
    skinSubsurface: 0.08
  }
};

const STYLE_APPEARANCE: Record<CharacterStyle, Partial<AppearanceState>> = {
  stylized: {
    skinRoughness: 0.58,
    skinSubsurface: 0.12,
    freckles: 0
  },
  semiReal: {
    skinRoughness: 0.64,
    skinSubsurface: 0.2,
    freckles: 0.08
  },
  realHuman: {
    skinRoughness: 0.7,
    skinSubsurface: 0.28,
    freckles: 0.12
  }
};

export function defaultsForLane(
  lane: CharacterLane,
  style: CharacterStyle,
  current: CharacterState
): CharacterState {
  return {
    ...current,
    lane,
    style,
    renderTarget: style === 'realHuman' ? 'unreal' : current.renderTarget,
    morphs: {
      ...BASE_MORPHS,
      ...LANE_MORPHS[lane]
    },
    appearance: {
      ...current.appearance,
      ...LANE_APPEARANCE[lane],
      ...STYLE_APPEARANCE[style]
    }
  };
}

export function applyStyle(
  style: CharacterStyle,
  current: CharacterState
): CharacterState {
  return {
    ...current,
    style,
    renderTarget: style === 'realHuman' ? 'unreal' : current.renderTarget,
    appearance: {
      ...current.appearance,
      ...STYLE_APPEARANCE[style]
    }
  };
}
