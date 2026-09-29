import type { BufferAttribute, BufferGeometry } from 'three';
import type { CharacterState } from '../types/character';
import { getMakeHumanTargetCatalog, getMakeHumanTargetText } from './desktop';
import { parseMakeHumanObj } from './makehumanObj';
import { parseMakeHumanTarget, type MakeHumanTargetDelta } from './makehumanTarget';
import { resolveNativeModifiers } from './makehumanDefinitions';
import {
  applyTargetDeltasInPlace,
  resolveMakeHumanAnatomyTargets,
  resolveMakeHumanMacroTargets,
  resolveMakeHumanMorphTargets,
  type ResolvedMorphTarget
} from './makehumanMorphs';

const targetCache = new Map<string, Promise<MakeHumanTargetDelta[]>>();
let catalogPromise: Promise<string[]> | null = null;

export function makeHumanTargetCatalog() {
  catalogPromise ??= getMakeHumanTargetCatalog();
  return catalogPromise;
}

export function makeHumanTargetDeltas(path: string) {
  let pending = targetCache.get(path);
  if (!pending) {
    pending = getMakeHumanTargetText(path).then(parseMakeHumanTarget);
    targetCache.set(path, pending);
  }
  return pending;
}

export function resolvedMakeHumanTargets(
  character: CharacterState,
  catalog: readonly string[]
): ResolvedMorphTarget[] {
  const merged = new Map<string, number>();
  for (const target of [
    ...resolveMakeHumanMacroTargets(character.lane, character.morphs, catalog, character.macro),
    ...(character.macro.age>=.5 ? resolveMakeHumanAnatomyTargets(character.lane, character.anatomy, catalog) : []),
    ...resolveMakeHumanMorphTargets(character.morphs, catalog),
    ...resolveNativeModifiers(character.nativeModifiers ?? {}, catalog)
  ]) {
    merged.set(target.path, (merged.get(target.path) ?? 0) + target.weight);
  }
  return [...merged].map(([path, weight]) => ({ path, weight }));
}

export async function evaluateMakeHumanGeometry(
  objText: string,
  character: CharacterState
): Promise<{ geometry: BufferGeometry; targets: ResolvedMorphTarget[] }> {
  const geometry = parseMakeHumanObj(objText);
  const catalog = await makeHumanTargetCatalog();
  const targets = resolvedMakeHumanTargets(character, catalog);
  const loaded = await Promise.all(
    targets.map(async ({ path, weight }) => ({
      weight,
      deltas: await makeHumanTargetDeltas(path)
    }))
  );

  const attribute = geometry.getAttribute('position') as BufferAttribute;
  const positions = new Float32Array(attribute.array as ArrayLike<number>);
  for (const target of loaded) {
    applyTargetDeltasInPlace(positions, target.deltas, target.weight);
  }
  attribute.copyArray(positions);
  attribute.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return { geometry, targets };
}

export function normalizeMakeHumanForViewport(geometry: BufferGeometry) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) return;
  const height = Math.max(0.001, box.max.y - box.min.y);
  const scale = 4.05 / height;
  geometry.scale(scale, scale, scale);
  geometry.computeBoundingBox();
  const next = geometry.boundingBox;
  if (next) {
    geometry.translate(
      -(next.min.x + next.max.x) * 0.5,
      -2.03 - next.min.y,
      -(next.min.z + next.max.z) * 0.5
    );
  }
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}

export function geometryToObj(geometry: BufferGeometry, name = 'MakeHumanBody') {
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();
  if (!index) throw new Error('MakeHuman production geometry must remain indexed.');
  const lines = ['# 3D Builder MakeHuman hm08 production body', `o ${name}`];
  for (let i = 0; i < position.count; i += 1) {
    lines.push(`v ${position.getX(i)} ${position.getY(i)} ${position.getZ(i)}`);
  }
  for (let i = 0; i < index.count; i += 3) {
    lines.push(`f ${index.getX(i) + 1} ${index.getX(i + 1) + 1} ${index.getX(i + 2) + 1}`);
  }
  return lines.join('\n') + '\n';
}
