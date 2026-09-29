import type { WardrobeSlot } from '../types/character';

export interface WardrobeDefinition {
  slot: WardrobeSlot;
  label: string;
  description: string;
}

export const WARDROBE: WardrobeDefinition[] = [
  { slot: 'shirt', label: 'Shirt', description: 'Fitted base-layer shirt.' },
  { slot: 'pants', label: 'Pants', description: 'Simple fitted trousers.' },
  { slot: 'boots', label: 'Boots', description: 'Rigid ankle-height boots.' },
  { slot: 'vest', label: 'Vest', description: 'Outer layer ready for future gear fitting.' }
];
