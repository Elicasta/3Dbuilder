import type { WardrobeSlot } from '../types/character';

export interface WardrobeDefinition {
  slot: WardrobeSlot;
  label: string;
  description: string;
}

export const WARDROBE: WardrobeDefinition[] = [
  { slot: 'shirt', label: 'Top', description: 'Fitted base-layer shirt or uniform top.' },
  { slot: 'pants', label: 'Bottom', description: 'Trousers, uniform pants, or lower garment.' },
  { slot: 'boots', label: 'Footwear', description: 'Boots or shoes attached to the base rig.' },
  { slot: 'vest', label: 'Outerwear', description: 'Jacket, vest, armor, or plate-carrier layer.' },
  { slot: 'headwear', label: 'Headwear', description: 'Hat, helmet, hood, or creature head layer.' },
  { slot: 'eyewear', label: 'Eyewear', description: 'Glasses, goggles, visor, or eye accessory.' },
  { slot: 'gloves', label: 'Gloves', description: 'Hand layer that follows the hand bones.' },
  { slot: 'belt', label: 'Belt', description: 'Waist attachment and holster anchor.' },
  { slot: 'gear', label: 'Gear', description: 'Pouches, packs, tactical pieces, and accessories.' }
];
