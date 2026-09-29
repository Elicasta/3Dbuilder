import { invoke } from '@tauri-apps/api/core';
import type { CharacterState } from '../types/character';

export interface BlenderStatus {
  found: boolean;
  path: string | null;
  platform: string;
}

export async function detectBlender(): Promise<BlenderStatus> {
  return invoke<BlenderStatus>('detect_blender');
}

export async function saveCharacterRecipe(character: CharacterState): Promise<string> {
  return invoke<string>('save_recipe', {
    name: character.name,
    recipe: JSON.stringify(
      {
        schema: '3dbuilder.character.v1',
        exportedAt: new Date().toISOString(),
        character
      },
      null,
      2
    )
  });
}
