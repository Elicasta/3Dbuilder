export type ReferenceSlot = 'front' | 'side' | 'back';
export type CharacterLane = 'male' | 'female' | 'alien';
export type CharacterStyle = 'stylized' | 'semiReal' | 'realHuman';
export type RenderTarget = 'general' | 'unreal' | 'print';
export type HairStyle =
  | 'buzz'
  | 'short'
  | 'sidePart'
  | 'curly'
  | 'afro'
  | 'bob'
  | 'long'
  | 'ponytail'
  | 'bun'
  | 'braids';
export type AnatomyMode = 'off' | 'simplified' | 'detailed';
export type DetailLayerType = 'tattoo' | 'scar' | 'mole' | 'makeup';

export interface CharacterReferences {
  front: File | null;
  side: File | null;
  back: File | null;
}

export interface BodyMorphs {
  height: number;
  build: number;
  shoulders: number;
  chest: number;
  chestDepth: number;
  waist: number;
  waistDepth: number;
  hips: number;
  hipDepth: number;
  torsoLength: number;
  armLength: number;
  armThickness: number;
  legLength: number;
  legThickness: number;
  handSize: number;
  footSize: number;
  neckLength: number;
  neckThickness: number;
  headScale: number;
  jawWidth: number;
  craniumScale: number;
  eyeScale: number;
  faceWidth: number;
  faceDepth: number;
  jawHeight: number;
  chinWidth: number;
  chinProjection: number;
  cheekWidth: number;
  eyeSpacing: number;
  eyeHeight: number;
  browHeight: number;
  noseWidth: number;
  noseLength: number;
  noseProjection: number;
  mouthWidth: number;
  lipFullness: number;
  earSize: number;
  bust: number;
  bustProjection: number;
}

export interface AppearanceState {
  skin: string;
  skinSecondary: string;
  eyes: string;
  sclera: string;
  hair: string;
  brows: string;
  lips: string;
  markings: string;
  underwear: string;
  shirt: string;
  pants: string;
  boots: string;
  vest: string;
  hairEnabled: boolean;
  hairStyle: HairStyle;
  hairLength: number;
  hairVolume: number;
  hairGloss: number;
  hairRootDarkening: number;
  skinRoughness: number;
  skinSubsurface: number;
  skinSpecular: number;
  skinOiliness: number;
  poreDetail: number;
  freckles: number;
  moles: number;
  scars: number;
  makeup: number;
  bodyHair: number;
  markingsOpacity: number;
  eyePupilScale: number;
  eyeLimbalRing: number;
  eyeWetness: number;
}

export interface DetailLayerState {
  id: string;
  type: DetailLayerType;
  name: string;
  enabled: boolean;
  color: string;
  opacity: number;
  positionX: number;
  positionY: number;
  scale: number;
  rotation: number;
  imageDataUrl: string | null;
}

export type WardrobeSlot =
  | 'shirt'
  | 'pants'
  | 'boots'
  | 'vest'
  | 'headwear'
  | 'eyewear'
  | 'gloves'
  | 'belt'
  | 'gear';

export interface WardrobeState {
  shirt: boolean;
  pants: boolean;
  boots: boolean;
  vest: boolean;
  headwear: boolean;
  eyewear: boolean;
  gloves: boolean;
  belt: boolean;
  gear: boolean;
}

export interface MakeHumanMacroState {
  age: number;
  muscle: number;
  weight: number;
  proportions: number;
  breastSize: number;
  breastFirmness: number;
  african: number;
  asian: number;
  caucasian: number;
}

export interface AnatomyState {
  mode: AnatomyMode;
  penisLength: number;
  penisGirth: number;
  glansSize: number;
  testicleSize: number;
  scrotumDrop: number;
  vulvaWidth: number;
  labiaMajora: number;
  labiaMinora: number;
  clitoralSize: number;
  vaginalOpening: number;
  monsPubis: number;
}

export interface CharacterState {
  name: string;
  lane: CharacterLane;
  style: CharacterStyle;
  renderTarget: RenderTarget;
  macro: MakeHumanMacroState;
  nativeModifiers: Record<string, number>;
  equippedAssets: string[];
  morphs: BodyMorphs;
  appearance: AppearanceState;
  details: DetailLayerState[];
  wardrobe: WardrobeState;
  anatomy: AnatomyState;
  rigCharacter: boolean;
  generateTextures: boolean;
  blenderCleanup: boolean;
}

export const BASE_MORPHS: BodyMorphs = {
  height: 1,
  build: 1,
  shoulders: 1,
  chest: 1,
  chestDepth: 1,
  waist: 1,
  waistDepth: 1,
  hips: 1,
  hipDepth: 1,
  torsoLength: 1,
  armLength: 1,
  armThickness: 1,
  legLength: 1,
  legThickness: 1,
  handSize: 1,
  footSize: 1,
  neckLength: 1,
  neckThickness: 1,
  headScale: 1,
  jawWidth: 1,
  craniumScale: 1,
  eyeScale: 1,
  faceWidth: 1,
  faceDepth: 1,
  jawHeight: 1,
  chinWidth: 1,
  chinProjection: 1,
  cheekWidth: 1,
  eyeSpacing: 1,
  eyeHeight: 1,
  browHeight: 1,
  noseWidth: 1,
  noseLength: 1,
  noseProjection: 1,
  mouthWidth: 1,
  lipFullness: 1,
  earSize: 1,
  bust: 1,
  bustProjection: 1
};

export const DEFAULT_CHARACTER: CharacterState = {
  name: 'New Character',
  lane: 'male',
  style: 'stylized',
  renderTarget: 'general',
  macro: {
    age: 0.5,
    muscle: 0.5,
    weight: 0.5,
    proportions: 0.5,
    breastSize: 0.5,
    breastFirmness: 0.5,
    african: 1 / 3,
    asian: 1 / 3,
    caucasian: 1 / 3
  },
  nativeModifiers: {},
  equippedAssets: [],
  morphs: { ...BASE_MORPHS },
  appearance: {
    skin: '#9a6248',
    skinSecondary: '#7d4c39',
    eyes: '#5c4938',
    sclera: '#eee9df',
    hair: '#17120f',
    brows: '#211813',
    lips: '#8f5148',
    markings: '#334f43',
    underwear: '#d8d8d8',
    shirt: '#4f5968',
    pants: '#323844',
    boots: '#7a5b3e',
    vest: '#655947',
    hairEnabled: true,
    hairStyle: 'short',
    hairLength: 0.35,
    hairVolume: 0.45,
    hairGloss: 0.32,
    hairRootDarkening: 0.22,
    skinRoughness: 0.62,
    skinSubsurface: 0.18,
    skinSpecular: 0.42,
    skinOiliness: 0.16,
    poreDetail: 0.32,
    freckles: 0,
    moles: 0.04,
    scars: 0,
    makeup: 0,
    bodyHair: 0.08,
    markingsOpacity: 0,
    eyePupilScale: 0.5,
    eyeLimbalRing: 0.48,
    eyeWetness: 0.62
  },
  details: [
    {
      id: 'tattoo-1',
      type: 'tattoo',
      name: 'Tattoo 1',
      enabled: false,
      color: '#171717',
      opacity: 0.8,
      positionX: 0,
      positionY: 0.2,
      scale: 0.5,
      rotation: 0,
      imageDataUrl: null
    }
  ],
  wardrobe: {
    shirt: false,
    pants: false,
    boots: false,
    vest: false,
    headwear: false,
    eyewear: false,
    gloves: false,
    belt: false,
    gear: false
  },
  anatomy: {
    mode: 'off',
    penisLength: 0.5,
    penisGirth: 0.5,
    glansSize: 0.5,
    testicleSize: 0.5,
    scrotumDrop: 0.5,
    vulvaWidth: 0.5,
    labiaMajora: 0.5,
    labiaMinora: 0.5,
    clitoralSize: 0.5,
    vaginalOpening: 0.5,
    monsPubis: 0.5
  },
  rigCharacter: true,
  generateTextures: true,
  blenderCleanup: true
};
