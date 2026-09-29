import { invoke } from '@tauri-apps/api/core';
import type { CharacterState } from '../types/character';
import type { EngineStatus, SystemCapabilities } from '../types/engine';
import { canonicalJoints } from './canonicalRig';
import { phase3ExportRecipe } from './canonicalExport';
import { productionSkinWeights } from './productionSkin';
import { evaluateMakeHumanGeometry, geometryToObj, resolvedMakeHumanTargets } from './makehumanCharacter';
import { makeHumanBones, makeHumanSkinWeights } from './makehumanRig';

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

export interface MakeHumanAssetEntry {
  kind: 'geometry' | 'proxy' | 'material';
  name: string;
  relativePath: string;
}

export async function getMakeHumanAssetCatalog(): Promise<MakeHumanAssetEntry[]> {
  return invoke<MakeHumanAssetEntry[]>('makehuman_asset_catalog');
}

export interface MakeHumanAssetBundle {
  relativePath: string;
  definitionText: string;
  objText: string;
  materialText: string | null;
}

export async function getMakeHumanAssetBundle(relativePath: string): Promise<MakeHumanAssetBundle> {
  return invoke<MakeHumanAssetBundle>('makehuman_asset_bundle', { relativePath });
}

export async function getMakeHumanDefinitionText(fileName: string): Promise<string> {
  return invoke<string>('makehuman_definition_text', { fileName });
}

export async function getMakeHumanTargetCatalog(): Promise<string[]> {
  return invoke<string[]>('makehuman_target_catalog');
}

export async function getMakeHumanTargetText(relativePath: string): Promise<string> {
  return invoke<string>('makehuman_target_text', { relativePath });
}

export async function getMakeHumanRigText(
  fileName: 'default.mhskel' | 'default_weights.mhw'
): Promise<string> {
  return invoke<string>('makehuman_rig_text', { fileName });
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
  const catalog = character.lane === 'alien' ? [] : await getMakeHumanTargetCatalog();
  const makeHumanTargets = character.lane === 'alien' ? [] : resolvedMakeHumanTargets(character, catalog);
  return invoke<string>('save_recipe', {
    name: character.name,
    recipe: JSON.stringify(
      {
        schema: '3dbuilder.character.v3',
        phase: 3,
        coordinateSystem: 'Y-up / meters / T-pose',
        canonical: character.lane === 'alien'
          ? { family: 'procedural-cage-v1', morphEngine: 'procedural', targets: [] }
          : { family: 'makehuman-hm08-v1', morphEngine: 'makehuman-targets-v1', targets: makeHumanTargets },
        topology: { stableVertexIds: true, maxInfluences: 4, subdivisionReady: character.lane === 'alien' },
        materials: {
          body: {
            uvSet: 'UV0',
            textureResolution: character.renderTarget === 'unreal' ? 4096 : 2048,
            pbrSlots: ['BaseColor', 'Normal', 'Roughness', 'Metallic', 'AO'],
            skin: {
              baseColor: character.appearance.skin,
              secondary: character.appearance.skinSecondary,
              roughness: character.appearance.skinRoughness,
              subsurfaceIntent: character.appearance.skinSubsurface
            }
          },
          separateObjects: ['eyes', 'hair', 'wardrobe']
        },
        wardrobe: {
          slots: character.wardrobe,
          basePresentation: 'underwear/minimal-clothing'
        },
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
  if (character.lane === 'alien') {
    const { canonicalObj } = await import('./canonicalExport');
    return invoke<void>('open_character_in_blender', {
      name: character.name,
      objText: canonicalObj(character),
      recipe: JSON.stringify(phase3ExportRecipe(character))
    });
  }

  const objText = await getMakeHumanBaseObj();
  const evaluated = await evaluateMakeHumanGeometry(objText, character);
  const productionObj = geometryToObj(evaluated.geometry, character.name || 'MakeHumanBody');

  const [skeletonText, weightText] = await Promise.all([
    getMakeHumanRigText('default.mhskel'),
    getMakeHumanRigText('default_weights.mhw')
  ]);
  const rig = {
    source: 'makehuman-default-v110',
    bones: makeHumanBones(evaluated.geometry, skeletonText),
    skin: makeHumanSkinWeights(
      weightText,
      evaluated.geometry.getAttribute('position').count
    )
  };
  evaluated.geometry.dispose();

  const recipe = {
    ...phase3ExportRecipe(character),
    canonical: {
      family: 'makehuman-hm08-v1',
      morphEngine: 'makehuman-targets-v1',
      targets: evaluated.targets
    },
    topology: {
      stableVertexIds: true,
      source: 'MakeHuman hm08 visible body',
      subdivisionReady: false
    },
    rig
  };

  return invoke<void>('open_character_in_blender', {
    name: character.name,
    objText: productionObj,
    recipe: JSON.stringify(recipe)
  });
}
