import { useEffect, useMemo } from 'react';
import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { CharacterState } from '../types/character';

type Ring = { y: number; rx: number; rz: number; x?: number };
type LimbPath = { points: Array<[number, number, number]>; radii: Array<[number, number]> };

function addTube(
  vertices: number[],
  indices: number[],
  points: Array<[number, number, number]>,
  radii: Array<[number, number]>,
  segments: number,
  horizontal: boolean
) {
  const base = vertices.length / 3;
  for (let r = 0; r < points.length; r += 1) {
    const [x, y, z] = points[r];
    const [ra, rb] = radii[r];
    for (let s = 0; s < segments; s += 1) {
      const a = (s / segments) * Math.PI * 2;
      if (horizontal) vertices.push(x, y + Math.cos(a) * ra, z + Math.sin(a) * rb);
      else vertices.push(x + Math.cos(a) * ra, y, z + Math.sin(a) * rb);
    }
  }
  for (let r = 0; r < points.length - 1; r += 1) {
    for (let s = 0; s < segments; s += 1) {
      const n = (s + 1) % segments;
      const a = base + r * segments + s;
      const b = base + (r + 1) * segments + s;
      const c = base + (r + 1) * segments + n;
      const d = base + r * segments + n;
      indices.push(a, b, c, a, c, d);
    }
  }
}

function buildBody(character: CharacterState) {
  const { morphs: m } = character;
  const h = m.height;
  const build = m.build;
  const floor = -1.92;
  const footY = floor + 0.13 * h;
  const hipY = 0.62 * h;
  const kneeY = hipY - Math.max(1.25, hipY - footY) * m.legLength * 0.52;
  const ankleY = footY + 0.18;
  const shoulderY = 2.02 * h * m.torsoLength;
  const neckY = 2.31 * h * m.torsoLength;
  const hipX = 0.34 * m.hips * build;
  const shoulderX = 0.7 * m.shoulders * build;
  const elbowX = shoulderX + 0.72 * m.armLength;
  const wristX = elbowX + 0.68 * m.armLength;
  const armT = 0.82 * m.armThickness * build;
  const legT = 0.92 * m.legThickness * build;

  const vertices: number[] = [];
  const indices: number[] = [];
  const seg = character.style === 'realHuman' ? 32 : 24;

  // Central torso is the canonical deformation cage. Arms and legs deliberately
  // share its landmark positions so a later skin/rig pass can weld identical
  // boundary loops without changing the character recipe.
  const rings: Ring[] = [
    { y: 0.48*h, rx: .48*build*m.hips, rz: .34*build*m.hipDepth },
    { y: 0.72*h, rx: .58*build*m.hips, rz: .40*build*m.hipDepth },
    { y: .98*h, rx: .50*build*m.waist, rz: .34*build*m.waistDepth },
    { y: 1.28*h*m.torsoLength, rx: .52*build*m.waist, rz: .36*build*m.waistDepth },
    { y: 1.52*h*m.torsoLength, rx: .67*build*m.chest, rz: .43*build*m.chestDepth },
    { y: 1.82*h*m.torsoLength, rx: .76*build*m.chest*m.shoulders, rz: .46*build*m.chestDepth },
    { y: shoulderY, rx: .70*build*m.shoulders, rz: .42*build*m.chestDepth },
    { y: 2.24*h*m.torsoLength, rx: .40*build*m.neckThickness, rz: .34*build*m.neckThickness },
    { y: neckY, rx: .25*m.neckThickness, rz: .23*m.neckThickness }
  ];
  addTube(vertices, indices, rings.map(r => [r.x ?? 0, r.y, 0]), rings.map(r => [r.rx, r.rz]), seg, false);

  const arms: LimbPath[] = [-1, 1].map(sign => ({
    points: [
      [sign*shoulderX*.92, shoulderY, 0],
      [sign*(shoulderX + .36*m.armLength), shoulderY-.025, 0],
      [sign*elbowX, shoulderY-.045, 0],
      [sign*(elbowX + .34*m.armLength), shoulderY-.025, 0],
      [sign*wristX, shoulderY, 0]
    ],
    radii: [[.22*armT,.205*armT],[.215*armT,.20*armT],[.17*armT,.165*armT],[.155*armT,.15*armT],[.12*armT,.115*armT]]
  }));
  arms.forEach(a => addTube(vertices, indices, a.points, a.radii, seg, true));

  const legs: LimbPath[] = [-1, 1].map(sign => ({
    points: [[sign*hipX,hipY+.08,0],[sign*hipX,hipY-(hipY-kneeY)*.54,0],[sign*hipX,kneeY,0],[sign*hipX,(kneeY+ankleY)/2,0],[sign*hipX,ankleY,.02]],
    radii: [[.25*legT,.245*legT],[.255*legT,.245*legT],[.175*legT,.17*legT],[.205*legT,.19*legT],[.125*legT,.12*legT]]
  }));
  legs.forEach(l => addTube(vertices, indices, l.points, l.radii, seg, false));

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

export default function CanonicalBody({ character }: { character: CharacterState }) {
  const geometry = useMemo(() => buildBody(character), [character]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={character.appearance.skin} roughness={character.appearance.skinRoughness} metalness={0.02} />
    </mesh>
  );
}
