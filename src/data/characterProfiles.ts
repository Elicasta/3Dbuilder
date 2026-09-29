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

const FACE: MorphControl[] = [
  { key:'faceWidth', label:'Face width', min:.78, max:1.24 },
  { key:'faceDepth', label:'Face depth', min:.78, max:1.25 },
  { key:'jawWidth', label:'Jaw width', min:.72, max:1.30 },
  { key:'jawHeight', label:'Jaw height', min:.78, max:1.24 },
  { key:'chinWidth', label:'Chin width', min:.72, max:1.30 },
  { key:'chinProjection', label:'Chin projection', min:.72, max:1.32 },
  { key:'cheekWidth', label:'Cheekbones', min:.78, max:1.24 },
  { key:'eyeScale', label:'Eye size', min:.80, max:1.28 },
  { key:'eyeSpacing', label:'Eye spacing', min:.78, max:1.25 },
  { key:'eyeHeight', label:'Eye height', min:.82, max:1.20 },
  { key:'browHeight', label:'Brow height', min:.82, max:1.24 },
  { key:'noseWidth', label:'Nose width', min:.72, max:1.32 },
  { key:'noseLength', label:'Nose length', min:.76, max:1.30 },
  { key:'noseProjection', label:'Nose projection', min:.68, max:1.42 },
  { key:'mouthWidth', label:'Mouth width', min:.72, max:1.30 },
  { key:'lipFullness', label:'Lip fullness', min:.62, max:1.50 },
  { key:'earSize', label:'Ear size', min:.72, max:1.35 }
];

export const MORPH_CONTROLS: Record<CharacterLane, MorphControl[]> = {
  male: [
    ...SHARED,
    { key: 'craniumScale', label: 'Cranium', min: 0.86, max: 1.18 },
    ...FACE
  ],
  female: [
    ...SHARED,
    { key: 'bust', label: 'Bust width', min: 0.72, max: 1.4 },
    { key: 'bustProjection', label: 'Bust projection', min: 0.65, max: 1.5 },
    { key: 'craniumScale', label: 'Cranium', min: 0.86, max: 1.18 },
    ...FACE
  ],
  alien: [
    ...SHARED,
    { key: 'craniumScale', label: 'Cranium', min: 0.9, max: 1.85 },
    ...FACE
  ]
};


export type MakeHumanControlGroupId =
  | 'macro'
  | 'measure'
  | 'face'
  | 'torso'
  | 'armslegs';

export interface MakeHumanControlGroup {
  id: MakeHumanControlGroupId;
  label: string;
  description: string;
  controls: MorphControl[];
}

const byKeys = (controls: MorphControl[], keys: Array<keyof BodyMorphs>) =>
  keys.flatMap((key) => controls.filter((control) => control.key === key));

export function makeHumanControlGroups(lane: CharacterLane): MakeHumanControlGroup[] {
  const controls = MORPH_CONTROLS[lane];
  return [
    {
      id: 'macro',
      label: 'Macro',
      description: 'MakeHuman body-level variables.',
      controls: byKeys(controls, ['height'])
    },
    {
      id: 'measure',
      label: 'Measure',
      description: 'Dimensions backed by MakeHuman measurement and scale modifiers.',
      controls: byKeys(controls, [
        'shoulders','chest','chestDepth','waist','hips','hipDepth',
        'torsoLength','neckLength','neckThickness'
      ])
    },
    {
      id: 'face',
      label: 'Face',
      description: 'Head, jaw, cheeks, eyes, nose, mouth and ears.',
      controls: byKeys(controls, [
        'faceWidth','faceDepth','jawWidth','jawHeight','chinProjection','cheekWidth','eyeScale','eyeSpacing',
        'browHeight','noseWidth','noseLength','noseProjection','mouthWidth','lipFullness','earSize'
      ])
    },
    {
      id: 'torso',
      label: 'Torso',
      description: 'Chest, waist, hips and sex-specific torso controls.',
      controls: byKeys(controls, [
        'chest','chestDepth','waist','hips','hipDepth','torsoLength','bust','bustProjection'
      ])
    },
    {
      id: 'armslegs',
      label: 'Arms / Legs',
      description: 'Limb length, thickness, hands and feet.',
      controls: byKeys(controls, [
        'armLength','armThickness','legLength','legThickness','handSize','footSize'
      ])
    }
  ].filter((group) => group.controls.length > 0);
}

const LANE_MORPHS: Record<CharacterLane, Partial<BodyMorphs>> = {
  // Artist-usable lane baselines. Native MakeHuman sex-dependent macro targets
  // still apply, but the UI must never collapse to an androgynous hm08 neutral
  // merely because a particular macro dependency filename is unavailable.
  // These values remain ordinary editable morph controls and are overwritten
  // by reference fitting when evidence is available.
  male: {
    shoulders:1.10, chest:1.06, chestDepth:1.05, waist:1.00, hips:.94, hipDepth:.98,
    armThickness:1.05, legThickness:1.03, neckThickness:1.07,
    faceWidth:1.03, jawWidth:1.08, jawHeight:1.03, cheekWidth:1.03,
    bust:.78, bustProjection:.78
  },
  female: {
    shoulders:.94, chest:.96, chestDepth:.98, waist:.91, hips:1.09, hipDepth:1.06,
    armThickness:.94, legThickness:.98, neckThickness:.93,
    faceWidth:.98, jawWidth:.92, jawHeight:.97, cheekWidth:1.02,
    bust:1.10, bustProjection:1.10
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
