import { invoke } from '@tauri-apps/api/core';
import type { CharacterState } from '../types/character';
import type { EngineStatus, SystemCapabilities } from '../types/engine';

export interface BlenderStatus {
  found: boolean;
  path: string | null;
  platform: string;
}

export async function detectBlender(): Promise<BlenderStatus> {
  return invoke<BlenderStatus>('detect_blender');
}

export async function getSystemCapabilities(): Promise<SystemCapabilities> {
  return invoke<SystemCapabilities>('system_capabilities');
}

export async function getEngineStatuses(): Promise<EngineStatus[]> {
  return invoke<EngineStatus[]>('engine_statuses');
}

export async function installEngineSource(id: string): Promise<string> {
  return invoke<string>('install_engine_source', { id });
}

export async function prepareEngineRuntime(id: string): Promise<string> {
  return invoke<string>('prepare_engine_runtime', { id });
}

export async function stageReference(file: File): Promise<string> {
  const bytes = Array.from(new Uint8Array(await file.arrayBuffer()));
  return invoke<string>('stage_reference', {
    name: file.name,
    bytes
  });
}

export async function runReconstruction(id: string, inputPath: string): Promise<string> {
  return invoke<string>('run_reconstruction', {
    id,
    inputPath
  });
}

export async function openInBlender(meshPath: string): Promise<void> {
  return invoke<void>('open_in_blender', { meshPath });
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
