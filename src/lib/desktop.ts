import { invoke } from '@tauri-apps/api/core';
import type { CharacterState } from '../types/character';
import type { EngineStatus, SystemCapabilities } from '../types/engine';
import { canonicalJoints } from './canonicalRig';
import { phase3ExportRecipe } from './canonicalExport';
import { productionSkinWeights } from './productionSkin';
import { evaluateMakeHumanGeometry, geometryToObj, resolvedMakeHumanTargets } from './makehumanCharacter';
import { makeHumanBones, makeHumanSkinWeights } from './makehumanRig';
import { fittedAssetFromTexts } from './makehumanAsset';

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
  const makeHuman=character.lane!=='alien';
  const catalog=makeHuman?await getMakeHumanTargetCatalog():[];
  const makeHumanTargets=makeHuman?resolvedMakeHumanTargets(character,catalog):[];
  let rig:any={joints:canonicalJoints(character),skin:productionSkinWeights(character)};
  let topology:any={stableVertexIds:true,maxInfluences:4,subdivisionReady:true};
  if(makeHuman){
    const objText=await getMakeHumanBaseObj();
    const evaluated=await evaluateMakeHumanGeometry(objText,character);
    try{
      const [skeletonText,weightText]=await Promise.all([getMakeHumanRigText('default.mhskel'),getMakeHumanRigText('default_weights.mhw')]);
      rig={source:'makehuman-default-v110',bones:makeHumanBones(evaluated.geometry,skeletonText),skin:makeHumanSkinWeights(weightText,evaluated.geometry.getAttribute('position').count)};
      topology={stableVertexIds:true,maxInfluences:4,source:'MakeHuman hm08 visible body',subdivisionReady:false};
    }finally{evaluated.geometry.dispose()}
  }
  return invoke<string>('save_recipe',{name:character.name,recipe:JSON.stringify({
    schema:'3dbuilder.character.v5',phase:5,coordinateSystem:'Y-up / meters / T-pose',
    canonical:makeHuman?{family:'makehuman-hm08-v1',morphEngine:'makehuman-targets-v1',targets:makeHumanTargets}:{family:'procedural-cage-v1',morphEngine:'procedural',targets:[]},
    topology,
    materials:{body:{uvSet:'UV0',textureResolution:character.renderTarget==='unreal'?4096:2048,pbrSlots:['BaseColor','Normal','Roughness','Metallic','AO'],skin:{baseColor:character.appearance.skin,secondary:character.appearance.skinSecondary,roughness:character.appearance.skinRoughness,subsurfaceIntent:character.appearance.skinSubsurface,specular:character.appearance.skinSpecular,oiliness:character.appearance.skinOiliness,poreDetail:character.appearance.poreDetail}},eyes:{iris:character.appearance.eyes,sclera:character.appearance.sclera,pupilScale:character.appearance.eyePupilScale,limbalRing:character.appearance.eyeLimbalRing,wetness:character.appearance.eyeWetness},hair:{color:character.appearance.hair,gloss:character.appearance.hairGloss},separateObjects:['eyes','teeth','tongue','hair','wardrobe']},
    details:character.details,wardrobe:{slots:character.wardrobe,equippedAssets:character.equippedAssets,basePresentation:'body'},rig,
    production:{neutralPose:'T-pose',requiresDeformationQA:true,requiresFacialRig:true,requiresLODValidation:true,requiresEngineImportValidation:true},
    exportedAt:new Date().toISOString(),character
  },null,2)});
}

export async function openCanonicalInBlender(character: CharacterState): Promise<void> {
  if (character.lane === 'alien') {
    const { canonicalObj } = await import('./canonicalExport');
    return invoke<void>('open_character_in_blender', {
      name: character.name,
      objText: canonicalObj(character),
      recipe: JSON.stringify(phase3ExportRecipe(character)),
      assets: []
    });
  }

  const objText = await getMakeHumanBaseObj();
  const evaluated = await evaluateMakeHumanGeometry(objText, character);
  const productionObj = geometryToObj(evaluated.geometry, character.name || 'CharacterBody');

  let selectedAssets = [...(character.equippedAssets ?? [])];
  const isHair = (path: string) => {
    const lower = path.toLowerCase();
    return (lower.includes('/hair/') || lower.includes('hair')) && !lower.includes('eyebrow') && !lower.includes('brow');
  };
  const isAnatomy = (path: string) => /genital|penis|vulva|vagina|labia/i.test(path);

  if (!character.appearance.hairEnabled) {
    selectedAssets = selectedAssets.filter((path) => !isHair(path));
  } else if (!selectedAssets.some(isHair)) {
    try {
      const catalog = await getMakeHumanAssetCatalog();
      const styleTerms: Record<string, string[]> = {
        buzz: ['buzz', 'shaved', 'short'],
        short: ['short', 'crew', 'male'],
        sidePart: ['side', 'part', 'short'],
        curly: ['curl', 'curly', 'wave'],
        afro: ['afro', 'coily', 'curl'],
        bob: ['bob', 'medium'],
        long: ['long', 'female'],
        ponytail: ['pony', 'tail'],
        bun: ['bun', 'updo'],
        braids: ['braid', 'cornrow']
      };
      const hairAssets = catalog.filter((item) => item.kind !== 'material' && isHair(item.relativePath));
      const terms = styleTerms[character.appearance.hairStyle] ?? [];
      const installed =
        hairAssets.find((item) => terms.some((term) => item.relativePath.toLowerCase().includes(term))) ??
        hairAssets[0];
      if (installed) selectedAssets.push(installed.relativePath);
    } catch {
      // Export stays deterministic when no installed hair asset exists.
    }
  }

  if (character.anatomy.mode === 'off') {
    selectedAssets = selectedAssets.filter((path) => !isAnatomy(path));
  } else if (character.anatomy.mode === 'detailed' && !selectedAssets.some(isAnatomy)) {
    try {
      const catalog = await getMakeHumanAssetCatalog();
      const installed = catalog.find((item) => item.kind !== 'material' && isAnatomy(item.relativePath));
      if (installed) selectedAssets.push(installed.relativePath);
    } catch {
      // Missing anatomy assets stay absent. Do not invent export geometry.
    }
  }

  const assets = await Promise.all(
    selectedAssets.map(async (path, index) => {
      const bundle = await getMakeHumanAssetBundle(path);
      const geometry = fittedAssetFromTexts(bundle.definitionText, bundle.objText, evaluated.geometry);
      try {
        return {
          name: bundle.relativePath.split('/').pop()?.replace(/\.[^.]+$/, '') || `asset-${index + 1}`,
          kind: isHair(path) ? 'hair' : isAnatomy(path) ? 'anatomy' : 'wardrobe',
          sourcePath: path,
          objText: geometryToObj(geometry, `CharacterAsset_${index + 1}`)
        };
      } finally {
        geometry.dispose();
      }
    })
  );

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

  const recipe = {
    ...phase3ExportRecipe(character),
    schema: '3dbuilder.character.v5',
    phase: 5,
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
    appearance: character.appearance,
    details: character.details,
    assets: assets.map(({ objText: _objText, ...asset }) => asset),
    rig
  };

  evaluated.geometry.dispose();

  return invoke<void>('open_character_in_blender', {
    name: character.name,
    objText: productionObj,
    recipe: JSON.stringify(recipe),
    assets
  });
}
