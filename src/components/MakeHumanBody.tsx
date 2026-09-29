import { useEffect, useMemo, useState } from 'react';
import { useLoader } from '@react-three/fiber';
import {
  CatmullRomCurve3,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  TextureLoader,
  Vector3,
  type BufferGeometry
} from 'three';
import type { CharacterState, DetailLayerState } from '../types/character';
import { getMakeHumanAssetBundle, getMakeHumanAssetCatalog, getMakeHumanRigText } from '../lib/desktop';
import { fittedAssetFromTexts, normalizeAssetWithBody, parseMhclo } from '../lib/makehumanAsset';
import { evaluateMakeHumanGeometry, normalizeMakeHumanForViewport } from '../lib/makehumanCharacter';
import { parseMakeHumanMaterial } from '../lib/makehumanMaterial';
import { parseMakeHumanObj } from '../lib/makehumanObj';
import { makeHumanBones, makeHumanSkinWeights } from '../lib/makehumanRig';
import { applyMakeHumanPose, MAKEHUMAN_POSES, skinMakeHumanGeometry } from '../lib/makehumanSkinning';

interface FittedAsset {
  path: string;
  geometry: BufferGeometry;
  materialText: string | null;
  definitionText: string;
  mesh?: import('three').SkinnedMesh;
  bones?: import('three').Bone[];
}

type RiggedBody = {
  geometry: BufferGeometry;
  mesh: import('three').SkinnedMesh;
  bones: import('three').Bone[];
};

const isHairPath = (path: string) => {
  const lower = path.toLowerCase();
  return (lower.includes('/hair/') || lower.includes('hair')) && !lower.includes('eyebrow') && !lower.includes('brow');
};

const isAnatomyPath = (path: string) => /genital|penis|vulva|vagina|labia/i.test(path);
const isEyePath = (path: string) => /(^|\/)(eye|eyes)(\/|\.|_|-)|eyeball|iris/i.test(path);

function transferAssetWeights(
  definitionText: string,
  bodyWeights: ReturnType<typeof makeHumanSkinWeights>,
  vertexCount: number
) {
  const definition = parseMhclo(definitionText);
  const bodyByVertex = new Map(bodyWeights.map((entry) => [entry.vertex, entry.influences]));
  const result: ReturnType<typeof makeHumanSkinWeights> = [];
  let weightedVertices = 0;

  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    const mapping = definition.vertices[vertex];
    const joints = new Map<string, number>();

    if (mapping) {
      for (let sourceIndex = 0; sourceIndex < 3; sourceIndex += 1) {
        const sourceVertex = mapping.vertices[sourceIndex];
        const sourceWeight = mapping.weights[sourceIndex];
        if (!sourceWeight) continue;

        for (const influence of bodyByVertex.get(sourceVertex) ?? []) {
          joints.set(
            influence.joint,
            (joints.get(influence.joint) ?? 0) + influence.weight * sourceWeight
          );
        }
      }
    }

    const total = [...joints.values()].reduce((sum, weight) => sum + weight, 0);
    const influences = [...joints.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([joint, weight]) => ({ joint, weight: total > 0 ? weight / total : 0 }))
      .filter((influence) => influence.weight > 0.0001);

    if (influences.length) weightedVertices += 1;
    result.push({ vertex, influences });
  }

  return weightedVertices >= Math.max(1, Math.floor(vertexCount * 0.5)) ? result : null;
}

function applySkinVertexColors(geometry: BufferGeometry, character: CharacterState) {
  const positions = geometry.getAttribute('position');
  if (!positions) return;

  const base = new Color(character.appearance.skin);
  const undertone = new Color(character.appearance.skinSecondary);
  const colors: number[] = [];
  const detail = character.appearance.poreDetail;
  const freckles = character.appearance.freckles;

  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const y = positions.getY(i);
    const z = positions.getZ(i);
    const wave = (Math.sin(x * 37.1 + y * 19.7 + z * 43.3) + 1) * 0.5;
    const poreMix = (wave - 0.5) * 0.12 * detail;
    const color = base.clone().lerp(undertone, 0.08 + Math.max(0, poreMix));

    const freckleSeed = (Math.sin(x * 173.3 + y * 129.9 + z * 211.7) + 1) * 0.5;
    const faceBias = y > 1.2 ? 1 : 0.28;
    if (freckles > 0 && freckleSeed > 0.965 - freckles * 0.05 * faceBias) {
      color.multiplyScalar(0.76);
    }

    colors.push(color.r, color.g, color.b);
  }

  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
}

function SkinMaterial({ character, attach }: { character: CharacterState; attach?: string }) {
  const appearance = character.appearance;
  return (
    <meshPhysicalMaterial
      vertexColors
      color="#ffffff"
      roughness={Math.max(0.16, appearance.skinRoughness - appearance.skinOiliness * 0.18)}
      metalness={0}
      clearcoat={appearance.skinOiliness * 0.28}
      clearcoatRoughness={0.3 + appearance.skinRoughness * 0.45}
      sheen={appearance.skinSubsurface * 0.35}
      sheenRoughness={0.72}
      sheenColor={appearance.skinSecondary}
      reflectivity={0.24 + appearance.skinSpecular * 0.5}
    />
  );
}

function HairMaterial({ character }: { character: CharacterState }) {
  return (
    <meshPhysicalMaterial
      color={character.appearance.hair}
      roughness={0.82 - character.appearance.hairGloss * 0.42}
      metalness={0}
      clearcoat={character.appearance.hairGloss * 0.24}
      clearcoatRoughness={0.34}
    />
  );
}

function HairStrand({ points, radius, character }: {
  points: Array<[number, number, number]>;
  radius: number;
  character: CharacterState;
}) {
  const curve = useMemo(
    () => new CatmullRomCurve3(points.map((point) => new Vector3(...point))),
    [points]
  );

  return (
    <mesh castShadow>
      <tubeGeometry args={[curve, 14, radius, 6, false]} />
      <HairMaterial character={character} />
    </mesh>
  );
}

function FallbackHair({ character }: { character: CharacterState }) {
  const { hairStyle, hairLength, hairVolume } = character.appearance;
  const volume = 0.86 + hairVolume * 0.24;
  const length = 0.14 + hairLength * 0.52;

  const strands = useMemo(() => {
    if (hairStyle === 'buzz') return [] as Array<Array<[number, number, number]>>;

    const count = hairStyle === 'braids' ? 12 : hairStyle === 'short' || hairStyle === 'sidePart' ? 20 : 28;
    const result: Array<Array<[number, number, number]>> = [];

    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2;
      const front = Math.sin(angle);
      const side = Math.abs(Math.cos(angle));
      const rootX = Math.cos(angle) * 0.27 * volume;
      const rootZ = Math.sin(angle) * 0.255 * volume;
      const partShift = hairStyle === 'sidePart' ? 0.055 : 0;
      const rootY = 1.91 - side * 0.035;

      let drop = length;
      if (hairStyle === 'short' || hairStyle === 'sidePart') drop *= 0.34;
      if (hairStyle === 'bob') drop *= 0.68;
      if (front > 0.45) drop *= hairStyle === 'long' || hairStyle === 'curly' ? 0.72 : 0.5;

      const flare = hairStyle === 'afro' ? 1.35 : 1.08;
      const curl = hairStyle === 'curly' || hairStyle === 'afro' ? 0.055 * Math.sin(i * 2.2) : 0;

      result.push([
        [rootX + partShift, rootY, rootZ],
        [rootX * 1.08 + curl + partShift * 0.5, rootY - drop * 0.42, rootZ * flare],
        [rootX * 1.12 - curl, rootY - drop, rootZ * flare * 1.02]
      ]);
    }

    return result;
  }, [hairStyle, hairLength, hairVolume, length, volume]);

  return (
    <group>
      <mesh position={[0, 1.885, -0.015]} scale={[0.31 * volume, 0.125 * volume, 0.305 * volume]} castShadow>
        <sphereGeometry args={[1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <HairMaterial character={character} />
      </mesh>

      {strands.map((points, index) => (
        <HairStrand
          key={index}
          points={points}
          radius={hairStyle === 'braids' ? 0.018 : hairStyle === 'afro' ? 0.017 : 0.011 + hairVolume * 0.006}
          character={character}
        />
      ))}

      {hairStyle === 'ponytail' && (
        <HairStrand
          character={character}
          radius={0.055}
          points={[[0, 1.84, -0.25], [0.03, 1.58, -0.36], [0.02, 1.22 - hairLength * 0.22, -0.33]]}
        />
      )}

      {hairStyle === 'bun' && (
        <mesh position={[0, 1.93, -0.29]} scale={[0.13, 0.13, 0.12]} castShadow>
          <sphereGeometry args={[1, 24, 16]} />
          <HairMaterial character={character} />
        </mesh>
      )}
    </group>
  );
}

function Eye({ x, character }: { x: number; character: CharacterState }) {
  const a = character.appearance;
  const scale = 0.82 + character.morphs.eyeScale * 0.18;
  const pupil = 0.010 + a.eyePupilScale * 0.012;
  const ringOpacity = 0.25 + a.eyeLimbalRing * 0.72;
  const y = 1.695 + (character.morphs.eyeHeight - 1) * 0.035;
  const z = 0.302 + (character.morphs.faceDepth - 1) * 0.025;

  return (
    <group position={[x, y, z]} scale={[scale, scale, scale]}>
      <mesh scale={[1.08, 0.72, 0.58]} castShadow>
        <sphereGeometry args={[0.073, 32, 24]} />
        <meshPhysicalMaterial color={a.sclera} roughness={0.34} clearcoat={0.08} clearcoatRoughness={0.16} />
      </mesh>
      <mesh position={[0, 0, 0.043]}>
        <circleGeometry args={[0.030, 40]} />
        <meshPhysicalMaterial color={a.eyes} roughness={0.34} clearcoat={0.18} />
      </mesh>
      <mesh position={[0, 0, 0.0445]}>
        <ringGeometry args={[0.0255, 0.0305, 40]} />
        <meshBasicMaterial color="#151719" transparent opacity={ringOpacity} />
      </mesh>
      <mesh position={[0, 0, 0.046]}>
        <circleGeometry args={[pupil, 32]} />
        <meshBasicMaterial color="#060708" />
      </mesh>
      <mesh scale={[1.11, 0.75, 0.61]}>
        <sphereGeometry args={[0.074, 32, 24]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.04 + a.eyeWetness * 0.12}
          roughness={0.02}
          clearcoat={1}
          clearcoatRoughness={0.02}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function EyeSystem({ character }: { character: CharacterState }) {
  if (character.lane === 'alien') return null;
  const spacing = 0.088 * character.morphs.eyeSpacing;
  return (
    <group>
      <Eye x={-spacing} character={character} />
      <Eye x={spacing} character={character} />
      <HairStrand points={[[-0.16, 1.775, 0.322], [-0.10, 1.79, 0.327], [-0.045, 1.778, 0.323]]} radius={0.006} character={character} />
      <HairStrand points={[[0.045, 1.778, 0.323], [0.10, 1.79, 0.327], [0.16, 1.775, 0.322]]} radius={0.006} character={character} />
    </group>
  );
}

function FaceDetails({ character }: { character: CharacterState }) {
  const a = character.appearance;
  const freckles = Math.round(a.freckles * 24);
  const frecklesList = Array.from({ length: freckles }, (_, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    const band = Math.floor(index / 2);
    return {
      x: side * (0.052 + (band % 5) * 0.012),
      y: 1.64 + ((band * 7) % 5) * 0.009,
      z: 0.344 + ((band * 3) % 4) * 0.002
    };
  });

  return (
    <group>
      {frecklesList.map((point, index) => (
        <mesh key={index} position={[point.x, point.y, point.z]} scale={[1, 0.72, 1]}>
          <sphereGeometry args={[0.004 + (index % 3) * 0.001, 10, 8]} />
          <meshBasicMaterial color={a.skinSecondary} transparent opacity={0.42} />
        </mesh>
      ))}

      {a.moles > 0.05 && (
        <mesh position={[0.115, 1.625, 0.348]}>
          <sphereGeometry args={[0.004 + a.moles * 0.004, 10, 8]} />
          <meshBasicMaterial color="#3a251d" transparent opacity={0.55 + a.moles * 0.35} />
        </mesh>
      )}

      {a.scars > 0.05 && (
        <mesh position={[-0.105, 1.61, 0.350]} rotation={[0, 0, -0.55]} scale={[0.055, 0.004 + a.scars * 0.004, 0.004]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={a.skinSecondary} transparent opacity={0.2 + a.scars * 0.4} />
        </mesh>
      )}

      {a.makeup > 0.03 && (
        <>
          <mesh position={[-0.10, 1.625, 0.343]} scale={[0.075, 0.032, 0.01]}>
            <sphereGeometry args={[1, 18, 12]} />
            <meshBasicMaterial color={a.lips} transparent opacity={a.makeup * 0.16} depthWrite={false} />
          </mesh>
          <mesh position={[0.10, 1.625, 0.343]} scale={[0.075, 0.032, 0.01]}>
            <sphereGeometry args={[1, 18, 12]} />
            <meshBasicMaterial color={a.lips} transparent opacity={a.makeup * 0.16} depthWrite={false} />
          </mesh>
        </>
      )}
    </group>
  );
}

function TattooTexture({ detail }: { detail: DetailLayerState }) {
  const texture = useLoader(TextureLoader, detail.imageDataUrl!);
  return (
    <meshBasicMaterial
      map={texture}
      transparent
      opacity={detail.opacity}
      depthWrite={false}
      side={DoubleSide}
      color={detail.color}
    />
  );
}

function TattooLayer({ character }: { character: CharacterState }) {
  const detail = character.details.find((item) => item.type === 'tattoo' && item.enabled);
  if (!detail) return null;

  const y = 1.17 + detail.positionY * 0.58;
  const x = detail.positionX * 0.46;
  const size = 0.18 + detail.scale * 0.42;

  return (
    <group position={[x, y, 0.425]} rotation={[0, 0, detail.rotation]}>
      {detail.imageDataUrl ? (
        <mesh scale={[size, size, 1]}>
          <planeGeometry args={[1, 1, 1, 1]} />
          <TattooTexture detail={detail} />
        </mesh>
      ) : (
        <group scale={[size, size, size]}>
          <mesh>
            <torusGeometry args={[0.30, 0.055, 10, 36]} />
            <meshBasicMaterial color={detail.color} transparent opacity={detail.opacity} />
          </mesh>
          <mesh rotation={[0, 0, 0.62]} scale={[0.75, 0.10, 0.03]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={detail.color} transparent opacity={detail.opacity} />
          </mesh>
          <mesh rotation={[0, 0, -0.62]} scale={[0.75, 0.10, 0.03]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={detail.color} transparent opacity={detail.opacity} />
          </mesh>
        </group>
      )}
    </group>
  );
}

export default function MakeHumanBody({
  objText,
  character,
  poseName = 'bind'
}: {
  objText: string;
  character: CharacterState;
  poseName?: string;
}) {
  const neutral = useMemo(() => {
    const geometry = parseMakeHumanObj(objText);
    normalizeMakeHumanForViewport(geometry);
    return geometry;
  }, [objText]);

  const [geometry, setGeometry] = useState<BufferGeometry>(() => neutral.clone());
  const [rigged, setRigged] = useState<RiggedBody | null>(null);
  const [assets, setAssets] = useState<FittedAsset[]>([]);

  const hasHairAsset = assets.some((asset) => isHairPath(asset.path));
  const hasEyeAsset = assets.some((asset) => isEyePath(asset.path));

  useEffect(() => {
    let cancelled = false;

    void evaluateMakeHumanGeometry(objText, character)
      .then(async ({ geometry: body }) => {
        let selected = [...(character.equippedAssets ?? [])];

        if (!character.appearance.hairEnabled) {
          selected = selected.filter((path) => !isHairPath(path));
        } else if (!selected.some(isHairPath)) {
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
            const hairAssets = catalog.filter((item) => item.kind !== 'material' && isHairPath(item.relativePath));
            const terms = styleTerms[character.appearance.hairStyle] ?? [];
            const installed =
              hairAssets.find((item) => terms.some((term) => item.relativePath.toLowerCase().includes(term))) ??
              hairAssets[0];
            if (installed) selected.push(installed.relativePath);
          } catch {
            // The local strand preview remains when no installed hair library is available.
          }
        }

        if (character.anatomy.mode === 'off') {
          selected = selected.filter((path) => !isAnatomyPath(path));
        } else if (character.anatomy.mode === 'detailed' && !selected.some(isAnatomyPath)) {
          try {
            const catalog = await getMakeHumanAssetCatalog();
            const installed = catalog.find((item) => item.kind !== 'material' && isAnatomyPath(item.relativePath));
            if (installed) selected.push(installed.relativePath);
          } catch {
            // No fallback primitives. Missing production anatomy stays absent.
          }
        }

        const fitted = await Promise.all(
          selected.map(async (path) => {
            const bundle = await getMakeHumanAssetBundle(path);
            const asset = fittedAssetFromTexts(bundle.definitionText, bundle.objText, body);
            normalizeAssetWithBody(asset, body);
            return {
              path,
              geometry: asset,
              materialText: bundle.materialText,
              definitionText: bundle.definitionText
            };
          })
        );

        const [skeletonText, weightText] = await Promise.all([
          getMakeHumanRigText('default.mhskel'),
          getMakeHumanRigText('default_weights.mhw')
        ]);

        const defs = makeHumanBones(body, skeletonText);
        const weights = makeHumanSkinWeights(weightText, body.getAttribute('position').count);

        body.computeBoundingBox();
        const before = body.boundingBox!;
        const rawHeight = Math.max(0.001, before.max.y - before.min.y);
        const scale = 4.05 / rawHeight;
        const cx = (before.min.x + before.max.x) / 2;
        const cz = (before.min.z + before.max.z) / 2;

        const normalizedDefs = defs.map((definition) => ({
          ...definition,
          head: [
            (definition.head[0] - cx) * scale,
            (definition.head[1] - before.min.y) * scale - 2.03,
            (definition.head[2] - cz) * scale
          ] as [number, number, number],
          tail: [
            (definition.tail[0] - cx) * scale,
            (definition.tail[1] - before.min.y) * scale - 2.03,
            (definition.tail[2] - cz) * scale
          ] as [number, number, number]
        }));

        normalizeMakeHumanForViewport(body);
        applySkinVertexColors(body, character);

        const skinned = skinMakeHumanGeometry(body, normalizedDefs, weights);

        for (const item of fitted) {
          const assetWeights = transferAssetWeights(
            item.definitionText,
            weights,
            item.geometry.getAttribute('position').count
          );
          if (!assetWeights) continue;
          const skinnedAsset = skinMakeHumanGeometry(item.geometry, normalizedDefs, assetWeights);
          item.mesh = skinnedAsset.mesh;
          item.bones = skinnedAsset.bones;
        }

        if (cancelled) {
          body.dispose();
          fitted.forEach((item) => item.geometry.dispose());
          return;
        }

        setRigged((previous) => {
          previous?.geometry.dispose();
          return { geometry: body, mesh: skinned.mesh, bones: skinned.bones };
        });

        setGeometry((previous) => {
          previous.dispose();
          return body.clone();
        });

        setAssets((previous) => {
          previous.forEach((item) => item.geometry.dispose());
          return fitted;
        });
      })
      .catch((error) => console.warn('MakeHuman character/asset evaluation failed', error));

    return () => {
      cancelled = true;
    };
  }, [objText, character]);

  useEffect(() => () => neutral.dispose(), [neutral]);

  useEffect(() => {
    const pose = MAKEHUMAN_POSES[poseName] ?? MAKEHUMAN_POSES.bind;
    if (rigged) applyMakeHumanPose(rigged.bones, pose);
    assets.forEach((asset) => {
      if (asset.bones) applyMakeHumanPose(asset.bones, pose);
    });
  }, [rigged, assets, poseName]);

  useEffect(
    () => () => {
      assets.forEach((item) => item.geometry.dispose());
    },
    []
  );

  return (
    <group>
      {rigged ? (
        <primitive object={rigged.mesh} castShadow receiveShadow>
          <SkinMaterial attach="material" character={character} />
        </primitive>
      ) : (
        <mesh geometry={geometry} castShadow receiveShadow>
          <SkinMaterial character={character} />
        </mesh>
      )}

      {!hasEyeAsset && <EyeSystem character={character} />}
      <FaceDetails character={character} />
      <TattooLayer character={character} />

      {character.appearance.hairEnabled && !hasHairAsset && <FallbackHair character={character} />}

      {assets.map((asset) => {
        const lower = asset.path.toLowerCase();
        const material = asset.materialText ? parseMakeHumanMaterial(asset.materialText) : null;
        const fallback = isHairPath(asset.path)
          ? character.appearance.hair
          : isAnatomyPath(asset.path)
            ? character.appearance.skinSecondary
            : lower.includes('eye')
              ? character.appearance.sclera
              : lower.includes('teeth')
                ? '#e7e1d7'
                : character.appearance.shirt;

        const materialNode = (
          <meshPhysicalMaterial
            color={material?.diffuseColor ?? fallback}
            roughness={material?.roughness ?? (lower.includes('eye') ? 0.18 : isHairPath(asset.path) ? 0.48 : 0.72)}
            metalness={0}
            clearcoat={lower.includes('eye') ? 0.72 : isHairPath(asset.path) ? character.appearance.hairGloss * 0.25 : 0.04}
            clearcoatRoughness={lower.includes('eye') ? 0.05 : 0.45}
            transparent={material?.transparent || (material?.opacity ?? 1) < 1}
            opacity={material?.opacity ?? 1}
          />
        );

        return asset.mesh ? (
          <primitive key={asset.path} object={asset.mesh} castShadow receiveShadow>
            {materialNode}
          </primitive>
        ) : (
          <mesh key={asset.path} geometry={asset.geometry} castShadow receiveShadow>
            {materialNode}
          </mesh>
        );
      })}
    </group>
  );
}
