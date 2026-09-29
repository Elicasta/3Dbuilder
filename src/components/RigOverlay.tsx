import { Line } from '@react-three/drei';
import { useMemo } from 'react';
import type { CharacterState } from '../types/character';
import { posedJoints } from '../lib/posedRig';
import type { PoseState } from '../lib/pose';

export default function RigOverlay({ character, pose }: { character: CharacterState; pose: PoseState }) {
  const joints = useMemo(() => posedJoints(character, pose), [character, pose]);
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
