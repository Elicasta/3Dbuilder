export type ReferenceSlot = 'front' | 'side' | 'back';

export interface CharacterReferences {
  front: File | null;
  side: File | null;
  back: File | null;
}

export interface BodyMorphs {
  height: number;
  build: number;
  shoulders: number;
  waist: number;
  legLength: number;
  headScale: number;
}

export interface CharacterColors {
  skin: string;
  hair: string;
  underwear: string;
  shirt: string;
  pants: string;
  boots: string;
  vest: string;
}

export type WardrobeSlot = 'shirt' | 'pants' | 'boots' | 'vest';

export interface WardrobeState {
  shirt: boolean;
  pants: boolean;
  boots: boolean;
  vest: boolean;
}

export interface CharacterState {
  name: string;
  style: 'stylized' | 'realistic';
  base: 'male' | 'female';
  morphs: BodyMorphs;
  colors: CharacterColors;
  wardrobe: WardrobeState;
  rigCharacter: boolean;
  generateTextures: boolean;
  blenderCleanup: boolean;
}

export const DEFAULT_CHARACTER: CharacterState = {
  name: 'New Character',
  style: 'stylized',
  base: 'male',
  morphs: {
    height: 1,
    build: 1,
    shoulders: 1,
    waist: 1,
    legLength: 1,
    headScale: 1
  },
  colors: {
    skin: '#9a6248',
    hair: '#17120f',
    underwear: '#d8d8d8',
    shirt: '#4f5968',
    pants: '#323844',
    boots: '#7a5b3e',
    vest: '#655947'
  },
  wardrobe: {
    shirt: false,
    pants: false,
    boots: false,
    vest: false
  },
  rigCharacter: true,
  generateTextures: true,
  blenderCleanup: true
};
