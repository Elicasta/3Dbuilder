import { ContactShadows, OrbitControls, useGLTF } from '@react-three/drei';
import { Suspense, useEffect, useMemo } from 'react';
import { Box3, BufferGeometry, Float32BufferAttribute, Group, Vector3 } from 'three';
import { Canvas } from '@react-three/fiber';
import type { CharacterState } from '../types/character';
import CanonicalBody from './CanonicalBody';

function Surface({
  color,
  roughness = 0.72,
  metalness = 0.02
}: {
  color: string;
  roughness?: number;
  metalness?: number;
}) {
  return (
    <meshStandardMaterial
      color={color}
      roughness={roughness}
      metalness={metalness}
    />
  );
}

function ContinuousTorso({
  rings,
  color,
  roughness,
  radialSegments = 48
}: {
  rings: Array<{ y: number; rx: number; rz: number }>;
  color: string;
  roughness?: number;
  radialSegments?: number;
}) {
  const geometry = useMemo(() => {
    const vertices: number[] = [];
    const indices: number[] = [];

    for (const ring of rings) {
      for (let segment = 0; segment < radialSegments; segment += 1) {
        const angle = (segment / radialSegments) * Math.PI * 2;
        vertices.push(
          Math.cos(angle) * ring.rx,
          ring.y,
          Math.sin(angle) * ring.rz
        );
      }
    }

    for (let ring = 0; ring < rings.length - 1; ring += 1) {
      const current = ring * radialSegments;
      const next = (ring + 1) * radialSegments;
      for (let segment = 0; segment < radialSegments; segment += 1) {
        const following = (segment + 1) % radialSegments;
        indices.push(
          current + segment,
          next + segment,
          next + following,
          current + segment,
          next + following,
          current + following
        );
      }
    }

    const bottomCenter = vertices.length / 3;
    vertices.push(0, rings[0].y, 0);
    const topCenter = vertices.length / 3;
    vertices.push(0, rings[rings.length - 1].y, 0);

    for (let segment = 0; segment < radialSegments; segment += 1) {
      const following = (segment + 1) % radialSegments;
      indices.push(bottomCenter, following, segment);
      const top = (rings.length - 1) * radialSegments;
      indices.push(topCenter, top + segment, top + following);
    }

    const result = new BufferGeometry();
    result.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    result.setIndex(indices);
    result.computeVertexNormals();
    return result;
  }, [rings, radialSegments]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <Surface color={color} roughness={roughness} />
    </mesh>
  );
}

function AnatomicalLimb({
  points,
  radii,
  color,
  roughness,
  radialSegments = 24
}: {
  points: Array<[number, number, number]>;
  radii: Array<[number, number]>;
  color: string;
  roughness?: number;
  radialSegments?: number;
}) {
  const geometry = useMemo(() => {
    const vertices: number[] = [];
    const indices: number[] = [];
    const ringCount = Math.min(points.length, radii.length);

    for (let ring = 0; ring < ringCount; ring += 1) {
      const [x, y, z] = points[ring];
      const [ry, rz] = radii[ring];
      for (let segment = 0; segment < radialSegments; segment += 1) {
        const angle = (segment / radialSegments) * Math.PI * 2;
        // Rings live in the plane perpendicular to the limb's X/Y path.
        // For arms the caller varies X; for legs it varies Y. We infer the
        // dominant axis from the endpoints so one topology helper serves both.
        const horizontal = Math.abs(points[ringCount - 1][0] - points[0][0]) >
          Math.abs(points[ringCount - 1][1] - points[0][1]);
        if (horizontal) {
          vertices.push(x, y + Math.cos(angle) * ry, z + Math.sin(angle) * rz);
        } else {
          vertices.push(x + Math.cos(angle) * ry, y, z + Math.sin(angle) * rz);
        }
      }
    }

    for (let ring = 0; ring < ringCount - 1; ring += 1) {
      for (let segment = 0; segment < radialSegments; segment += 1) {
        const nextSegment = (segment + 1) % radialSegments;
        const a = ring * radialSegments + segment;
        const b = (ring + 1) * radialSegments + segment;
        const c = (ring + 1) * radialSegments + nextSegment;
        const d = ring * radialSegments + nextSegment;
        indices.push(a, b, c, a, c, d);
      }
    }

    const startCenter = vertices.length / 3;
    vertices.push(...points[0]);
    const endCenter = vertices.length / 3;
    vertices.push(...points[ringCount - 1]);
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const nextSegment = (segment + 1) % radialSegments;
      indices.push(startCenter, segment, nextSegment);
      const end = (ringCount - 1) * radialSegments;
      indices.push(endCenter, end + nextSegment, end + segment);
    }

    const result = new BufferGeometry();
    result.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    result.setIndex(indices);
    result.computeVertexNormals();
    return result;
  }, [points, radii, radialSegments]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <Surface color={color} roughness={roughness} />
    </mesh>
  );
}

function Limb({
  position,
  scale,
  rotation = [0, 0, 0],
  color,
  roughness
}: {
  position: [number, number, number];
  scale: [number, number, number];
  rotation?: [number, number, number];
  color: string;
  roughness?: number;
}) {
  return (
    <mesh position={position} scale={scale} rotation={rotation} castShadow>
      <capsuleGeometry args={[0.18, 1.0, 10, 24]} />
      <Surface color={color} roughness={roughness} />
    </mesh>
  );
}

function Joint({ position, scale, color, roughness }: { position: [number, number, number]; scale: [number, number, number]; color: string; roughness?: number }) {
  return (
    <mesh position={position} scale={scale} castShadow>
      <sphereGeometry args={[0.3, 28, 20]} />
      <Surface color={color} roughness={roughness} />
    </mesh>
  );
}

function Hand({ position, scale, color, roughness }: { position: [number, number, number]; scale: number; color: string; roughness?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh scale={[0.38, 0.22, 0.16]} castShadow>
        <sphereGeometry args={[0.55, 24, 18]} />
        <Surface color={color} roughness={roughness} />
      </mesh>
      <mesh position={[0.23, -0.04, 0.03]} rotation={[0, 0, -0.35]} scale={[0.2, 0.08, 0.08]} castShadow>
        <capsuleGeometry args={[0.2, 0.55, 8, 16]} />
        <Surface color={color} roughness={roughness} />
      </mesh>
    </group>
  );
}

function Foot({ position, scale, color, roughness }: { position: [number, number, number]; scale: number; color: string; roughness?: number }) {
  return (
    <mesh position={position} scale={[0.34 * scale, 0.2 * scale, 0.62 * scale]} castShadow>
      <sphereGeometry args={[0.72, 28, 18]} />
      <Surface color={color} roughness={roughness} />
    </mesh>
  );
}

function Eye({
  x,
  y,
  z,
  scale,
  sclera,
  iris,
  alien
}: {
  x: number;
  y: number;
  z: number;
  scale: number;
  sclera: string;
  iris: string;
  alien: boolean;
}) {
  return (
    <group position={[x, y, z]} scale={[scale * (alien ? 1.18 : 1), scale, scale * 0.62]}>
      <mesh castShadow>
        <sphereGeometry args={[0.12, 24, 18]} />
        <Surface color={sclera} roughness={0.28} />
      </mesh>
      <mesh position={[0, 0, 0.108]}>
        <sphereGeometry args={[0.054, 20, 16]} />
        <Surface color={iris} roughness={0.2} />
      </mesh>
    </group>
  );
}

function CharacterMesh({ character }: { character: CharacterState }) {
  const { morphs, appearance, wardrobe, lane, style } = character;
  const height = morphs.height;
  const build = morphs.build;
  const shoulder = morphs.shoulders;
  const chest = morphs.chest;
  const chestDepth = morphs.chestDepth;
  const waist = morphs.waist;
  const waistDepth = morphs.waistDepth;
  const hips = morphs.hips;
  const hipDepth = morphs.hipDepth;
  const legLength = morphs.legLength;
  const torsoLength = morphs.torsoLength;
  const head = morphs.headScale;
  const cranium = morphs.craniumScale;
  const eyeScale = morphs.eyeScale;
  const skinRoughness = appearance.skinRoughness;
  const alien = lane === 'alien';
  const female = lane === 'female';
  const realistic = style === 'realHuman';

  // One connected proportion scaffold. Keep the pelvis above the knees and the
  // ankles on a stable floor so the editable body reads like a person before
  // any AI candidate is introduced.
  const floorY = -1.92;
  const footY = floorY + 0.13 * height;
  const hipJointY = 0.62 * height;
  const legSpan = Math.max(1.25, hipJointY - footY) * legLength;
  const kneeY = hipJointY - legSpan * 0.52;
  const ankleY = footY + 0.18;
  const torsoY = 1.42 * height * torsoLength;
  const shoulderY = 2.02 * height * torsoLength;
  const neckY = 2.31 * height * torsoLength;
  const headY = 2.72 * height * torsoLength + (morphs.neckLength - 1) * 0.18;
  const armThickness = 0.82 * morphs.armThickness * build;
  const legThickness = 0.92 * morphs.legThickness * build;
  const hipX = 0.34 * hips * build;
  const shoulderJointX = 0.7 * shoulder * build;
  const upperArm = 0.72 * morphs.armLength;
  const forearm = 0.68 * morphs.armLength;
  const elbowX = shoulderJointX + upperArm;
  const wristX = elbowX + forearm;
  const armReach = wristX + 0.13 * morphs.handSize;

  return (
    <group position={[0, -0.2, 0]}>
      <CanonicalBody character={character} />
      <Joint position={[-shoulderJointX, shoulderY, 0]} scale={[0.42 * build, 0.54 * build, 0.56 * chestDepth]} color={appearance.skin} roughness={skinRoughness} />
      <Joint position={[shoulderJointX, shoulderY, 0]} scale={[0.42 * build, 0.54 * build, 0.56 * chestDepth]} color={appearance.skin} roughness={skinRoughness} />
      <Joint position={[-hipX, hipJointY, 0]} scale={[0.72 * legThickness, 0.92 * legThickness, 0.76 * hipDepth]} color={appearance.skin} roughness={skinRoughness} />
      <Joint position={[hipX, hipJointY, 0]} scale={[0.72 * legThickness, 0.92 * legThickness, 0.76 * hipDepth]} color={appearance.skin} roughness={skinRoughness} />
      <mesh position={[0, neckY, 0]} scale={[0.38 * morphs.neckThickness, 0.48 * morphs.neckLength, 0.36 * morphs.neckThickness]} castShadow>
        <capsuleGeometry args={[0.25, 0.45, 8, 20]} />
        <Surface color={appearance.skin} roughness={skinRoughness} />
      </mesh>
      <mesh position={[0, headY, 0]} scale={[0.62 * head * morphs.jawWidth, 0.72 * head * cranium, 0.62 * head * (alien ? cranium * 1.05 : 1)]} castShadow>
        <sphereGeometry args={[0.72, realistic ? 48 : 36, realistic ? 36 : 28]} />
        <Surface color={appearance.skin} roughness={skinRoughness} />
      </mesh>
      {alien && <mesh position={[0, headY + 0.25 * head, -0.03]} scale={[0.7 * head * cranium, 0.46 * head * cranium, 0.65 * head * cranium]} castShadow><sphereGeometry args={[0.72, 36, 28]} /><Surface color={appearance.skinSecondary} roughness={skinRoughness} /></mesh>}
      {appearance.hairEnabled && <mesh position={[0, headY + 0.25 * head, -0.11]} scale={[0.63 * head, 0.31 * head * cranium, 0.62 * head]} castShadow><sphereGeometry args={[0.72, 36, 24]} /><Surface color={appearance.hair} roughness={0.9} /></mesh>}
      {!alien && <>
        <mesh position={[-0.49 * head * morphs.jawWidth, headY - 0.01 * head, 0]} scale={[0.09 * head, 0.16 * head, 0.055 * head]} castShadow><sphereGeometry args={[0.72, 20, 14]} /><Surface color={appearance.skin} roughness={skinRoughness} /></mesh>
        <mesh position={[0.49 * head * morphs.jawWidth, headY - 0.01 * head, 0]} scale={[0.09 * head, 0.16 * head, 0.055 * head]} castShadow><sphereGeometry args={[0.72, 20, 14]} /><Surface color={appearance.skin} roughness={skinRoughness} /></mesh>
        <mesh position={[0, headY - 0.06 * head, 0.505 * head]} scale={[0.075 * head, 0.13 * head, 0.11 * head]} castShadow><sphereGeometry args={[0.7, 20, 14]} /><Surface color={appearance.skin} roughness={skinRoughness} /></mesh>
      </>}
      <Eye x={-0.19 * head} y={headY + 0.03 * head} z={0.42 * head * (alien ? cranium : 1)} scale={eyeScale} sclera={appearance.sclera} iris={appearance.eyes} alien={alien} />
      <Eye x={0.19 * head} y={headY + 0.03 * head} z={0.42 * head * (alien ? cranium : 1)} scale={eyeScale} sclera={appearance.sclera} iris={appearance.eyes} alien={alien} />
      {!alien && <>
        <mesh position={[-0.19 * head, headY + 0.19 * head, 0.49 * head]} rotation={[0, 0, -0.08]} scale={[0.17 * head, 0.025 * head, 0.025]}><boxGeometry args={[1, 1, 1]} /><Surface color={appearance.brows} roughness={0.86} /></mesh>
        <mesh position={[0.19 * head, headY + 0.19 * head, 0.49 * head]} rotation={[0, 0, 0.08]} scale={[0.17 * head, 0.025 * head, 0.025]}><boxGeometry args={[1, 1, 1]} /><Surface color={appearance.brows} roughness={0.86} /></mesh>
      </>}
      <mesh position={[0, headY - 0.26 * head, 0.455 * head]} scale={[0.22 * morphs.jawWidth, 0.055, 0.035]}><sphereGeometry args={[0.5, 20, 14]} /><Surface color={appearance.lips} roughness={0.58} /></mesh>
      <AnatomicalLimb
        points={[
          [-shoulderJointX * 0.92, shoulderY, 0],
          [-shoulderJointX - upperArm * 0.48, shoulderY - 0.025, 0],
          [-elbowX, shoulderY - 0.045, 0],
          [-elbowX - forearm * 0.52, shoulderY - 0.025, 0],
          [-wristX, shoulderY, 0]
        ]}
        radii={[
          [0.22 * armThickness, 0.205 * armThickness],
          [0.215 * armThickness, 0.2 * armThickness],
          [0.17 * armThickness, 0.165 * armThickness],
          [0.155 * armThickness, 0.15 * armThickness],
          [0.12 * armThickness, 0.115 * armThickness]
        ]}
        color={appearance.skin}
        roughness={skinRoughness}
        radialSegments={realistic ? 32 : 24}
      />
      <AnatomicalLimb
        points={[
          [shoulderJointX * 0.92, shoulderY, 0],
          [shoulderJointX + upperArm * 0.48, shoulderY - 0.025, 0],
          [elbowX, shoulderY - 0.045, 0],
          [elbowX + forearm * 0.52, shoulderY - 0.025, 0],
          [wristX, shoulderY, 0]
        ]}
        radii={[
          [0.22 * armThickness, 0.205 * armThickness],
          [0.215 * armThickness, 0.2 * armThickness],
          [0.17 * armThickness, 0.165 * armThickness],
          [0.155 * armThickness, 0.15 * armThickness],
          [0.12 * armThickness, 0.115 * armThickness]
        ]}
        color={appearance.skin}
        roughness={skinRoughness}
        radialSegments={realistic ? 32 : 24}
      />
      <AnatomicalLimb
        points={[
          [-hipX, hipJointY + 0.08, 0],
          [-hipX, hipJointY - legSpan * 0.28, 0],
          [-hipX, kneeY, 0],
          [-hipX, kneeY - legSpan * 0.28, 0],
          [-hipX, ankleY, 0.02]
        ]}
        radii={[
          [0.25 * legThickness, 0.245 * legThickness],
          [0.255 * legThickness, 0.245 * legThickness],
          [0.175 * legThickness, 0.17 * legThickness],
          [0.205 * legThickness, 0.19 * legThickness],
          [0.125 * legThickness, 0.12 * legThickness]
        ]}
        color={appearance.skin}
        roughness={skinRoughness}
        radialSegments={realistic ? 32 : 24}
      />
      <AnatomicalLimb
        points={[
          [hipX, hipJointY + 0.08, 0],
          [hipX, hipJointY - legSpan * 0.28, 0],
          [hipX, kneeY, 0],
          [hipX, kneeY - legSpan * 0.28, 0],
          [hipX, ankleY, 0.02]
        ]}
        radii={[
          [0.25 * legThickness, 0.245 * legThickness],
          [0.255 * legThickness, 0.245 * legThickness],
          [0.175 * legThickness, 0.17 * legThickness],
          [0.205 * legThickness, 0.19 * legThickness],
          [0.125 * legThickness, 0.12 * legThickness]
        ]}
        color={appearance.skin}
        roughness={skinRoughness}
        radialSegments={realistic ? 32 : 24}
      />
      <Hand position={[-armReach, shoulderY, 0]} scale={morphs.handSize * build} color={appearance.skin} roughness={skinRoughness} />
      <Hand position={[armReach, shoulderY, 0]} scale={morphs.handSize * build} color={appearance.skin} roughness={skinRoughness} />
      <Foot position={[-hipX, footY, 0.18]} scale={morphs.footSize * build} color={appearance.skin} roughness={skinRoughness} />
      <Foot position={[hipX, footY, 0.18]} scale={morphs.footSize * build} color={appearance.skin} roughness={skinRoughness} />
      <mesh position={[0, 0.75 * height, 0]} scale={[0.8 * build * waist, 0.34, 0.53 * build * waistDepth]} castShadow><boxGeometry args={[1.35, 0.72, 0.9]} /><Surface color={appearance.underwear} roughness={0.88} /></mesh>
      {female && morphs.bust > 0.72 && <><mesh position={[-0.27 * chest, torsoY + 0.18, 0.41 * chestDepth]} scale={[0.28 * morphs.bust, 0.3 * morphs.bust, 0.2 * morphs.bustProjection]} castShadow><sphereGeometry args={[0.55, 28, 20]} /><Surface color={wardrobe.shirt ? appearance.shirt : appearance.skin} roughness={skinRoughness} /></mesh><mesh position={[0.27 * chest, torsoY + 0.18, 0.41 * chestDepth]} scale={[0.28 * morphs.bust, 0.3 * morphs.bust, 0.2 * morphs.bustProjection]} castShadow><sphereGeometry args={[0.55, 28, 20]} /><Surface color={wardrobe.shirt ? appearance.shirt : appearance.skin} roughness={skinRoughness} /></mesh></>}
      {wardrobe.shirt && <mesh position={[0, torsoY, 0]} scale={[0.9 * build * chest * shoulder, 0.89 * height * torsoLength, 0.51 * build * chestDepth]} castShadow><capsuleGeometry args={[0.6, 1.18, 10, 30]} /><Surface color={appearance.shirt} roughness={0.82} /></mesh>}
      {wardrobe.pants && <><Limb position={[-hipX, (hipJointY + kneeY) / 2, 0]} scale={[legThickness * 1.08, Math.max(0.5, hipJointY - kneeY) * 0.82, legThickness * 1.08]} color={appearance.pants} /><Limb position={[hipX, (hipJointY + kneeY) / 2, 0]} scale={[legThickness * 1.08, Math.max(0.5, hipJointY - kneeY) * 0.82, legThickness * 1.08]} color={appearance.pants} /></>}
      {wardrobe.boots && <><mesh position={[-hipX, footY + 0.16 * height, 0.16]} scale={[0.48 * morphs.footSize * build, 0.55 * height, 0.78 * morphs.footSize]} castShadow><boxGeometry args={[1, 1, 1]} /><Surface color={appearance.boots} roughness={0.78} /></mesh><mesh position={[hipX, footY + 0.16 * height, 0.16]} scale={[0.48 * morphs.footSize * build, 0.55 * height, 0.78 * morphs.footSize]} castShadow><boxGeometry args={[1, 1, 1]} /><Surface color={appearance.boots} roughness={0.78} /></mesh></>}
      {wardrobe.vest && <mesh position={[0, torsoY + 0.08, 0.08]} scale={[1.02 * build * chest * shoulder, 0.72 * height, 0.59 * build * chestDepth]} castShadow><boxGeometry args={[1.3, 1.45, 0.95]} /><Surface color={appearance.vest} roughness={0.92} /></mesh>}
      {wardrobe.headwear && <mesh position={[0, headY + 0.36 * head, 0]} scale={[0.72 * head * cranium, 0.26 * head, 0.72 * head * cranium]} castShadow><sphereGeometry args={[0.78, 32, 20]} /><Surface color={appearance.vest} roughness={0.8} /></mesh>}
      {wardrobe.eyewear && <mesh position={[0, headY + 0.02 * head, 0.49 * head * (alien ? cranium : 1)]} scale={[0.48 * head * eyeScale, 0.11 * head, 0.04]} castShadow><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="#141922" roughness={0.2} metalness={0.08} transparent opacity={0.82} /></mesh>}
      {wardrobe.gloves && <><mesh position={[-wristX, shoulderY, 0]} scale={[0.2 * morphs.handSize, 0.28 * morphs.handSize, 0.13 * morphs.handSize]} rotation={[0, 0, Math.PI / 2]} castShadow><boxGeometry args={[1, 1, 1]} /><Surface color={appearance.boots} roughness={0.84} /></mesh><mesh position={[wristX, shoulderY, 0]} scale={[0.2 * morphs.handSize, 0.28 * morphs.handSize, 0.13 * morphs.handSize]} rotation={[0, 0, Math.PI / 2]} castShadow><boxGeometry args={[1, 1, 1]} /><Surface color={appearance.boots} roughness={0.84} /></mesh></>}
      {wardrobe.belt && <mesh position={[0, 0.83 * height, 0]} scale={[0.83 * build * waist, 0.08, 0.56 * build * waistDepth]} castShadow><boxGeometry args={[1.4, 0.6, 0.9]} /><Surface color={appearance.boots} roughness={0.76} /></mesh>}
      {wardrobe.gear && <group position={[0, torsoY - 0.05, 0.54 * build * chestDepth]}><mesh position={[-0.36, 0.05, 0]} scale={[0.22, 0.28, 0.12]} castShadow><boxGeometry args={[1, 1, 1]} /><Surface color={appearance.vest} roughness={0.9} /></mesh><mesh position={[0, 0.02, 0]} scale={[0.22, 0.31, 0.12]} castShadow><boxGeometry args={[1, 1, 1]} /><Surface color={appearance.vest} roughness={0.9} /></mesh><mesh position={[0.36, 0.05, 0]} scale={[0.22, 0.28, 0.12]} castShadow><boxGeometry args={[1, 1, 1]} /><Surface color={appearance.vest} roughness={0.9} /></mesh></group>}
      {appearance.markingsOpacity > 0.02 && <mesh position={[0, torsoY + 0.02, 0.5 * chestDepth]} scale={[0.45 * chest, 0.45, 0.025]}><sphereGeometry args={[0.8, 24, 16]} /><meshStandardMaterial color={appearance.markings} transparent opacity={appearance.markingsOpacity * 0.6} roughness={0.7} /></mesh>}
    </group>
  );
}

type ViewMode = 'canonical' | 'ai' | 'overlay';

function AlignedAICandidate({ url, character, overlay = false }: { url: string; character: CharacterState; overlay?: boolean }) {
  const gltf = useGLTF(url);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene, overlay]);
  const target = useMemo(() => {
    // Canonical builder geometry has a stable floor at -2.03. Derive its
    // current height from the same morph math used by CharacterMesh so the
    // candidate follows edited proportions instead of a hard-coded 5.15.
    const headY = 2.85 * character.morphs.height * character.morphs.torsoLength +
      (character.morphs.neckLength - 1) * 0.18 - 0.2;
    const headRadiusY = 0.72 * character.morphs.headScale * character.morphs.craniumScale * 0.72;
    return { floor: -2.03, top: headY + headRadiusY };
  }, [character]);

  useEffect(() => {
    scene.rotation.set(0, 0, Math.PI / 2);
    scene.position.set(0, 0, 0);
    scene.scale.setScalar(1);
    scene.updateMatrixWorld(true);

    let bounds = new Box3().setFromObject(scene);
    const size = bounds.getSize(new Vector3());
    const targetHeight = Math.max(0.5, target.top - target.floor);
    scene.scale.setScalar(size.y > 0 ? targetHeight / size.y : 1);
    scene.updateMatrixWorld(true);

    bounds = new Box3().setFromObject(scene);

    // TripoSR often produces an incomplete/detached arm. A normal bounding-box
    // center lets that bad limb drag the whole candidate sideways. Center from
    // the median vertex position instead, which follows the torso/head mass and
    // stays stable even when one extremity is malformed.
    const xs: number[] = [];
    const zs: number[] = [];
    const point = new Vector3();
    scene.traverse((object: any) => {
      if (!object.isMesh || !object.geometry?.attributes?.position) return;
      const positions = object.geometry.attributes.position;
      const stride = Math.max(1, Math.floor(positions.count / 12000));
      for (let i = 0; i < positions.count; i += stride) {
        point.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld);
        xs.push(point.x);
        zs.push(point.z);
      }
    });
    const median = (values: number[]) => {
      if (!values.length) return 0;
      values.sort((a, b) => a - b);
      const middle = Math.floor(values.length / 2);
      return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
    };
    scene.position.x -= median(xs);
    scene.position.z -= median(zs);
    scene.position.y += target.floor - bounds.min.y;
    scene.updateMatrixWorld(true);

    scene.traverse((object) => {
      const mesh = object as unknown as { isMesh?: boolean; castShadow?: boolean; receiveShadow?: boolean; material?: any };
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const sources = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const materials = sources.map((source: any) => {
        const material = source?.clone ? source.clone() : source;
        if (overlay && material) {
          material.transparent = true;
          material.opacity = 0.34;
          material.depthWrite = false;
        }
        return material;
      });
      mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
    });
  }, [scene, overlay, target]);

  return <primitive object={scene as Group} />;
}

export default function CharacterViewport({
  character,
  aiMeshUrl = null,
  viewMode = 'canonical',
  onViewModeChange
}: {
  character: CharacterState;
  aiMeshUrl?: string | null;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}) {
  return (
    <section className="panel viewport-panel">
      <div className="panel-header viewport-header">
        <div><h2>Live 3D Builder</h2><p>{character.lane} · {character.style} · {character.renderTarget}</p></div>
        <div className="viewport-mode-switch">
          {(['canonical', 'ai', 'overlay'] as ViewMode[]).map((mode) => (
            <button key={mode} type="button" className={viewMode === mode ? 'active' : ''} disabled={!aiMeshUrl && mode !== 'canonical'} onClick={() => onViewModeChange?.(mode)}>
              {mode === 'canonical' ? 'Canonical' : mode === 'ai' ? 'AI Candidate' : 'Overlay'}
            </button>
          ))}
          <span className="live-badge">LIVE</span>
        </div>
      </div>
      <div className="viewport-canvas">
        <Canvas shadows camera={{ position: [5.5, 2.6, 6.2], fov: 34 }}>
          <color attach="background" args={['#11151d']} />
          <ambientLight intensity={1.2} />
          <directionalLight castShadow intensity={3.1} position={[4, 8, 5]} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
          <directionalLight intensity={1.25} position={[-5, 3, -4]} />
          {(viewMode === 'canonical' || viewMode === 'overlay') && <CharacterMesh character={character} />}
          {aiMeshUrl && (viewMode === 'ai' || viewMode === 'overlay') && <Suspense fallback={null}><AlignedAICandidate url={aiMeshUrl} character={character} overlay={viewMode === 'overlay'} /></Suspense>}
          <gridHelper args={[18, 18, '#303846', '#202630']} position={[0, -2.05, 0]} />
          <ContactShadows position={[0, -2.03, 0]} opacity={0.38} scale={10} blur={2.5} far={6} />
          <OrbitControls makeDefault target={[0, 0.62, 0]} minDistance={3.8} maxDistance={13} enablePan />
        </Canvas>
      </div>
    </section>
  );
}
