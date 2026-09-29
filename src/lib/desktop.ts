import { invoke } from '@tauri-apps/api/core';
import type { CharacterState } from '../types/character';
import type { EngineStatus, SystemCapabilities } from '../types/engine';
import { canonicalJoints } from './canonicalRig';
import { canonicalObj, phase3ExportRecipe } from './canonicalExport';
import { productionSkinWeights } from './productionSkin';

export interface MakeHumanAssetStatus {
  installed: boolean;
  baseMeshPath: string | null;
  targetsPath: string | null;
  targetCount: number;
}

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

export async function getMakeHumanBaseObj(): Promise<string> {
  return invoke<string>('makehuman_base_obj');
}

export async function getMakeHumanTargetCatalog(): Promise<string[]> {
  return invoke<string[]>('makehuman_target_catalog');
}

export async function getMakeHumanTargetText(relativePath: string): Promise<string> {
  return invoke<string>('makehuman_target_text', { relativePath });
}

export async function getMakeHumanAssetStatus(): Promise<MakeHumanAssetStatus> {
  return invoke<MakeHumanAssetStatus>('makehuman_asset_status');
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

export async function getLatestGeneratedMesh(): Promise<string | null> {
  return invoke<string | null>('latest_generated_mesh');
}

export async function openInBlender(meshPath: string): Promise<void> {
  return invoke<void>('open_in_blender', { meshPath });
}

export async function saveCharacterRecipe(character: CharacterState): Promise<string> {
  return invoke<string>('save_recipe', {
    name: character.name,
    recipe: JSON.stringify(
      {
        schema: '3dbuilder.character.v3',
        phase: 3,
        coordinateSystem: 'Y-up / meters / T-pose',
        topology: { stableVertexIds: true, maxInfluences: 4, subdivisionReady: true },
        rig: { joints: canonicalJoints(character), skin: productionSkinWeights(character) },
        exportedAt: new Date().toISOString(),
        character
      },
      null,
      2
    )
  });
}

export async function openCanonicalInBlender(character: CharacterState): Promise<void> {
  return invoke<void>('open_character_in_blender', {
    name: character.name,
    objText: canonicalObj(character),
    recipe: JSON.stringify(phase3ExportRecipe(character))
  });
}
