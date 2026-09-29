import { ContactShadows, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import type { CharacterState } from '../types/character';

function Material({ color, roughness = 0.72 }: { color: string; roughness?: number }) {
  return <meshStandardMaterial color={color} roughness={roughness} metalness={0.02} />;
}

function Limb({
  position,
  scale,
  rotation = [0, 0, 0],
  color
}: {
  position: [number, number, number];
  scale: [number, number, number];
  rotation?: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={position} scale={scale} rotation={rotation} castShadow>
      <capsuleGeometry args={[0.18, 1.0, 8, 20]} />
      <Material color={color} />
    </mesh>
  );
}

function CharacterMesh({ character }: { character: CharacterState }) {
  const { morphs, colors, wardrobe } = character;
  const height = morphs.height;
  const build = morphs.build;
  const shoulder = morphs.shoulders;
  const waist = morphs.waist;
  const leg = morphs.legLength;
  const head = morphs.headScale;

  const torsoY = 1.65 * height;
  const armY = 2.0 * height;
  const legY = -0.05 * height * leg;

  return (
    <group position={[0, -0.2, 0]}>
      <mesh position={[0, 2.75 * height, 0]} scale={[0.62 * head, 0.72 * head, 0.62 * head]} castShadow>
        <sphereGeometry args={[0.72, 40, 32]} />
        <Material color={colors.skin} roughness={0.62} />
      </mesh>

      <mesh position={[0, 3.02 * height, -0.11]} scale={[0.62 * head, 0.28 * head, 0.61 * head]} castShadow>
        <sphereGeometry args={[0.72, 36, 24]} />
        <Material color={colors.hair} roughness={0.9} />
      </mesh>

      <mesh position={[0, torsoY, 0]} scale={[0.96 * build * shoulder, 1.0 * height, 0.48 * build]} castShadow>
        <capsuleGeometry args={[0.55, 1.15, 10, 28]} />
        <Material color={colors.skin} />
      </mesh>

      <mesh position={[0, 0.75 * height, 0]} scale={[0.79 * build * waist, 0.34, 0.52 * build]} castShadow>
        <boxGeometry args={[1.4, 0.72, 0.9]} />
        <Material color={colors.underwear} roughness={0.88} />
      </mesh>

      <Limb position={[-1.58 * shoulder * build, armY, 0]} scale={[0.86, 0.94 * height, 0.86]} rotation={[0, 0, Math.PI / 2]} color={colors.skin} />
      <Limb position={[1.58 * shoulder * build, armY, 0]} scale={[0.86, 0.94 * height, 0.86]} rotation={[0, 0, Math.PI / 2]} color={colors.skin} />

      <Limb position={[-0.45 * build * waist, legY, 0]} scale={[0.98 * build, 1.22 * height * leg, 0.98 * build]} color={colors.skin} />
      <Limb position={[0.45 * build * waist, legY, 0]} scale={[0.98 * build, 1.22 * height * leg, 0.98 * build]} color={colors.skin} />

      {wardrobe.shirt && (
        <mesh position={[0, torsoY, 0]} scale={[1.0 * build * shoulder, 1.02 * height, 0.51 * build]} castShadow>
          <capsuleGeometry args={[0.57, 1.12, 10, 28]} />
          <Material color={colors.shirt} roughness={0.82} />
        </mesh>
      )}

      {wardrobe.pants && (
        <>
          <Limb position={[-0.45 * build * waist, legY + 0.02, 0]} scale={[1.06 * build, 1.23 * height * leg, 1.06 * build]} color={colors.pants} />
          <Limb position={[0.45 * build * waist, legY + 0.02, 0]} scale={[1.06 * build, 1.23 * height * leg, 1.06 * build]} color={colors.pants} />
        </>
      )}

      {wardrobe.boots && (
        <>
          <mesh position={[-0.45 * build * waist, -1.5 * height * leg, 0.14]} scale={[0.5 * build, 0.55 * height, 0.78]} castShadow>
            <boxGeometry args={[1, 1, 1]} />
            <Material color={colors.boots} roughness={0.78} />
          </mesh>
          <mesh position={[0.45 * build * waist, -1.5 * height * leg, 0.14]} scale={[0.5 * build, 0.55 * height, 0.78]} castShadow>
            <boxGeometry args={[1, 1, 1]} />
            <Material color={colors.boots} roughness={0.78} />
          </mesh>
        </>
      )}

      {wardrobe.vest && (
        <mesh position={[0, torsoY + 0.08, 0.08]} scale={[1.08 * build * shoulder, 0.76 * height, 0.59 * build]} castShadow>
          <boxGeometry args={[1.3, 1.45, 0.95]} />
          <Material color={colors.vest} roughness={0.92} />
        </mesh>
      )}
    </group>
  );
}

export default function CharacterViewport({ character }: { character: CharacterState }) {
  return (
    <section className="panel viewport-panel">
      <div className="panel-header viewport-header">
        <div>
          <h2>Live 3D Builder</h2>
          <p>Drag to orbit. Scroll to zoom. Controls update the model immediately.</p>
        </div>
        <span className="live-badge">LIVE</span>
      </div>

      <div className="viewport-canvas">
        <Canvas shadows camera={{ position: [6.7, 3.2, 7.2], fov: 38 }}>
          <color attach="background" args={['#11151d']} />
          <ambientLight intensity={1.25} />
          <directionalLight castShadow intensity={3.2} position={[4, 8, 5]} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
          <directionalLight intensity={1.3} position={[-5, 3, -4]} />
          <CharacterMesh character={character} />
          <gridHelper args={[18, 18, '#303846', '#202630']} position={[0, -2.05, 0]} />
          <ContactShadows position={[0, -2.03, 0]} opacity={0.38} scale={10} blur={2.5} far={6} />
          <OrbitControls makeDefault target={[0, 0.6, 0]} minDistance={4.5} maxDistance={13} enablePan />
        </Canvas>
      </div>
    </section>
  );
}
