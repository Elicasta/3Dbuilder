import { useEffect, useMemo, useState } from 'react';
import { BufferGeometry } from 'three';
import type { CharacterState } from '../types/character';
import { getMakeHumanTargetCatalog, getMakeHumanTargetText } from '../lib/desktop';
import { parseMakeHumanObj } from '../lib/makehumanObj';
import { parseMakeHumanTarget, type MakeHumanTargetDelta } from '../lib/makehumanTarget';
import { applyTargetDeltasInPlace, resolveMakeHumanMacroTargets, resolveMakeHumanMorphTargets } from '../lib/makehumanMorphs';

const targetCache = new Map<string, Promise<MakeHumanTargetDelta[]>>();
let catalogPromise: Promise<string[]> | null = null;

function targetCatalog() {
  catalogPromise ??= getMakeHumanTargetCatalog();
  return catalogPromise;
}

function targetDeltas(path: string) {
  let pending = targetCache.get(path);
  if (!pending) {
    pending = getMakeHumanTargetText(path).then(parseMakeHumanTarget);
    targetCache.set(path, pending);
  }
  return pending;
}

function normalizeForViewport(geometry: BufferGeometry, character: CharacterState) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) return;

  const sourceHeight = Math.max(0.001, box.max.y - box.min.y);
  // Morph targets own human proportions. Viewport normalization only brings
  // the resulting MakeHuman character into our scene coordinate scale.
  const scale = 4.05 / sourceHeight;
  geometry.scale(scale, scale, scale);
  geometry.computeBoundingBox();

  const next = geometry.boundingBox;
  if (next) {
    const centerX = (next.min.x + next.max.x) * 0.5;
    const centerZ = (next.min.z + next.max.z) * 0.5;
    geometry.translate(-centerX, -2.03 - next.min.y, -centerZ);
  }

  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}

export default function MakeHumanBody({
  objText,
  character
}: {
  objText: string;
  character: CharacterState;
}) {
  const baseGeometry = useMemo(() => parseMakeHumanObj(objText), [objText]);
  const [geometry, setGeometry] = useState<BufferGeometry>(() => {
    const initial = baseGeometry.clone();
    normalizeForViewport(initial, character);
    return initial;
  });

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const catalog = await targetCatalog();
      const resolved = [
        ...resolveMakeHumanMacroTargets(character.lane, character.morphs, catalog),
        ...resolveMakeHumanMorphTargets(character.morphs, catalog)
      ];
      const loaded = await Promise.all(
        resolved.map(async ({ path, weight }) => ({
          weight,
          deltas: await targetDeltas(path)
        }))
      );
      if (cancelled) return;

      const next = baseGeometry.clone();
      const attribute = next.getAttribute('position');
      const positions = new Float32Array(attribute.array as ArrayLike<number>);

      for (const target of loaded) {
        applyTargetDeltasInPlace(positions, target.deltas, target.weight);
      }

      attribute.copyArray(positions);
      attribute.needsUpdate = true;
      normalizeForViewport(next, character);

      setGeometry((previous) => {
        previous.dispose();
        return next;
      });
    })().catch((error) => {
      // Keep a valid neutral hm08 body visible if an individual target cannot
      // be read. Engine Lab/status reporting owns installation errors.
      console.warn('MakeHuman morph update failed', error);
    });

    return () => {
      cancelled = true;
    };
  }, [baseGeometry, character.lane, character.morphs]);

  useEffect(() => () => {
    baseGeometry.dispose();
  }, [baseGeometry]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial
        color={character.appearance.skin}
        roughness={character.appearance.skinRoughness}
        metalness={0.01}
      />
    </mesh>
  );
}
