import { useEffect, useMemo } from 'react';
import type { BufferGeometry } from 'three';
import type { CharacterState } from '../types/character';
import { parseMakeHumanObj } from '../lib/makehumanObj';

export default function MakeHumanBody({
  objText,
  character
}: {
  objText: string;
  character: CharacterState;
}) {
  const geometry = useMemo<BufferGeometry>(() => {
    const parsed = parseMakeHumanObj(objText);
    parsed.center();
    parsed.computeBoundingBox();
    const box = parsed.boundingBox;
    if (box) {
      const height = Math.max(0.001, box.max.y - box.min.y);
      // Match the existing viewport's approximately four-unit standing human
      // while keeping all hm08 vertex IDs and faces untouched.
      const scale = 4.05 / height;
      parsed.scale(scale, scale, scale);
      parsed.computeBoundingBox();
      const floor = parsed.boundingBox?.min.y ?? 0;
      parsed.translate(0, -2.03 - floor, 0);
    }
    parsed.computeBoundingSphere();
    return parsed;
  }, [objText]);

  useEffect(() => () => geometry.dispose(), [geometry]);

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
