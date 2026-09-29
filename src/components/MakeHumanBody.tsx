import { useEffect, useMemo, useState } from 'react';
import type { BufferGeometry } from 'three';
import type { CharacterState } from '../types/character';
import {
  evaluateMakeHumanGeometry,
  normalizeMakeHumanForViewport
} from '../lib/makehumanCharacter';
import { parseMakeHumanObj } from '../lib/makehumanObj';

export default function MakeHumanBody({
  objText,
  character
}: {
  objText: string;
  character: CharacterState;
}) {
  const neutral = useMemo(() => {
    const geometry = parseMakeHumanObj(objText);
    normalizeMakeHumanForViewport(geometry);
    return geometry;
  }, [objText]);
  const [geometry, setGeometry] = useState<BufferGeometry>(() => neutral.clone());

  useEffect(() => {
    let cancelled = false;
    void evaluateMakeHumanGeometry(objText, character)
      .then(({ geometry: next }) => {
        if (cancelled) {
          next.dispose();
          return;
        }
        normalizeMakeHumanForViewport(next);
        setGeometry((previous) => {
          previous.dispose();
          return next;
        });
      })
      .catch((error) => {
        console.warn('MakeHuman character evaluation failed', error);
      });

    return () => {
      cancelled = true;
    };
  }, [objText, character]);

  useEffect(() => () => {
    neutral.dispose();
  }, [neutral]);

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
