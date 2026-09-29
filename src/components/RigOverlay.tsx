import { Line } from '@react-three/drei';
import { useMemo } from 'react';
import type { CharacterState } from '../types/character';
import { canonicalJoints } from '../lib/canonicalRig';

export default function RigOverlay({ character }: { character: CharacterState }) {
  const joints = useMemo(() => canonicalJoints(character), [character]);
  const byName = useMemo(() => new Map(joints.map(j => [j.name, j])), [joints]);

  return (
    <group position={[0, -0.2, 0]}>
      {joints.map(joint => {
        const parent = joint.parent ? byName.get(joint.parent) : null;
        return (
          <group key={joint.name}>
            {parent && <Line points={[parent.position, joint.position]} lineWidth={1.5} color="#75bfff" transparent opacity={0.72} />}
            <mesh position={joint.position}>
              <sphereGeometry args={[joint.name === 'pelvis' || joint.name === 'head' ? 0.055 : 0.038, 12, 8]} />
              <meshBasicMaterial color="#bfe2ff" depthTest={false} transparent opacity={0.9} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
