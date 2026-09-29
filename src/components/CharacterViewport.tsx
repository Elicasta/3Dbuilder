import { ContactShadows, OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import type { CharacterState } from '../types/character';

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

  const legBaseY = -0.08 * height;
  const torsoY = 1.52 * height * torsoLength;
  const shoulderY = 2.05 * height * torsoLength;
  const neckY = 2.42 * height * torsoLength;
  const headY = 2.85 * height * torsoLength + (morphs.neckLength - 1) * 0.18;
  const armX = 1.58 * shoulder * build;
  const armScaleX = 0.9 * morphs.armLength;
  const armThickness = 0.82 * morphs.armThickness * build;
  const legThickness = 0.92 * morphs.legThickness * build;
  const hipX = 0.44 * hips * build;

  return (
    <group position={[0, -0.2, 0]}>
      <mesh
        position={[0, torsoY, 0]}
        scale={[
          0.86 * build * chest * shoulder,
          0.86 * height * torsoLength,
          0.48 * build * chestDepth
        ]}
        castShadow
      >
        <capsuleGeometry args={[0.58, 1.18, 12, realistic ? 36 : 28]} />
        <Surface color={appearance.skin} roughness={skinRoughness} />
      </mesh>

      <mesh
        position={[0, 0.72 * height, 0]}
        scale={[
          0.78 * build * hips,
          0.38 * height,
          0.5 * build * hipDepth
        ]}
        castShadow
      >
        <capsuleGeometry args={[0.5, 0.5, 10, 24]} />
        <Surface color={appearance.skinSecondary} roughness={skinRoughness} />
      </mesh>

      <mesh
        position={[0, neckY, 0]}
        scale={[
          0.38 * morphs.neckThickness,
          0.48 * morphs.neckLength,
          0.36 * morphs.neckThickness
        ]}
        castShadow
      >
        <capsuleGeometry args={[0.25, 0.45, 8, 20]} />
        <Surface color={appearance.skin} roughness={skinRoughness} />
      </mesh>

      <mesh
        position={[0, headY, 0]}
        scale={[
          0.62 * head * morphs.jawWidth,
          0.72 * head * cranium,
          0.62 * head * (alien ? cranium * 1.05 : 1)
        ]}
        castShadow
      >
        <sphereGeometry args={[0.72, realistic ? 48 : 36, realistic ? 36 : 28]} />
        <Surface color={appearance.skin} roughness={skinRoughness} />
      </mesh>

      {alien && (
        <mesh
          position={[0, headY + 0.25 * head, -0.03]}
          scale={[0.7 * head * cranium, 0.46 * head * cranium, 0.65 * head * cranium]}
          castShadow
        >
          <sphereGeometry args={[0.72, 36, 28]} />
          <Surface color={appearance.skinSecondary} roughness={skinRoughness} />
        </mesh>
      )}

      {appearance.hairEnabled && (
        <mesh
          position={[0, headY + 0.25 * head, -0.11]}
          scale={[0.63 * head, 0.31 * head * cranium, 0.62 * head]}
          castShadow
        >
          <sphereGeometry args={[0.72, 36, 24]} />
          <Surface color={appearance.hair} roughness={0.9} />
        </mesh>
      )}

      <Eye
        x={-0.19 * head}
        y={headY + 0.03 * head}
        z={0.42 * head * (alien ? cranium : 1)}
        scale={eyeScale}
        sclera={appearance.sclera}
        iris={appearance.eyes}
        alien={alien}
      />
      <Eye
        x={0.19 * head}
        y={headY + 0.03 * head}
        z={0.42 * head * (alien ? cranium : 1)}
        scale={eyeScale}
        sclera={appearance.sclera}
        iris={appearance.eyes}
        alien={alien}
      />

      <mesh
        position={[0, headY - 0.26 * head, 0.455 * head]}
        scale={[0.22 * morphs.jawWidth, 0.055, 0.035]}
      >
        <sphereGeometry args={[0.5, 20, 14]} />
        <Surface color={appearance.lips} roughness={0.58} />
      </mesh>

      <Limb
        position={[-armX, shoulderY, 0]}
        scale={[armThickness, armScaleX, armThickness]}
        rotation={[0, 0, Math.PI / 2]}
        color={appearance.skin}
        roughness={skinRoughness}
      />
      <Limb
        position={[armX, shoulderY, 0]}
        scale={[armThickness, armScaleX, armThickness]}
        rotation={[0, 0, Math.PI / 2]}
        color={appearance.skin}
        roughness={skinRoughness}
      />

      <Limb
        position={[-hipX, legBaseY, 0]}
        scale={[legThickness, 1.2 * height * legLength, legThickness]}
        color={appearance.skin}
        roughness={skinRoughness}
      />
      <Limb
        position={[hipX, legBaseY, 0]}
        scale={[legThickness, 1.2 * height * legLength, legThickness]}
        color={appearance.skin}
        roughness={skinRoughness}
      />

      <mesh
        position={[0, 0.75 * height, 0]}
        scale={[0.8 * build * waist, 0.34, 0.53 * build * waistDepth]}
        castShadow
      >
        <boxGeometry args={[1.35, 0.72, 0.9]} />
        <Surface color={appearance.underwear} roughness={0.88} />
      </mesh>

      {female && morphs.bust > 0.72 && (
        <>
          <mesh
            position={[-0.27 * chest, torsoY + 0.18, 0.41 * chestDepth]}
            scale={[0.28 * morphs.bust, 0.3 * morphs.bust, 0.2 * morphs.bustProjection]}
            castShadow
          >
            <sphereGeometry args={[0.55, 28, 20]} />
            <Surface color={wardrobe.shirt ? appearance.shirt : appearance.skin} roughness={skinRoughness} />
          </mesh>
          <mesh
            position={[0.27 * chest, torsoY + 0.18, 0.41 * chestDepth]}
            scale={[0.28 * morphs.bust, 0.3 * morphs.bust, 0.2 * morphs.bustProjection]}
            castShadow
          >
            <sphereGeometry args={[0.55, 28, 20]} />
            <Surface color={wardrobe.shirt ? appearance.shirt : appearance.skin} roughness={skinRoughness} />
          </mesh>
        </>
      )}

      {wardrobe.shirt && (
        <mesh
          position={[0, torsoY, 0]}
          scale={[
            0.9 * build * chest * shoulder,
            0.89 * height * torsoLength,
            0.51 * build * chestDepth
          ]}
          castShadow
        >
          <capsuleGeometry args={[0.6, 1.18, 10, 30]} />
          <Surface color={appearance.shirt} roughness={0.82} />
        </mesh>
      )}

      {wardrobe.pants && (
        <>
          <Limb
            position={[-hipX, legBaseY + 0.02, 0]}
            scale={[legThickness * 1.08, 1.22 * height * legLength, legThickness * 1.08]}
            color={appearance.pants}
          />
          <Limb
            position={[hipX, legBaseY + 0.02, 0]}
            scale={[legThickness * 1.08, 1.22 * height * legLength, legThickness * 1.08]}
            color={appearance.pants}
          />
        </>
      )}

      {wardrobe.boots && (
        <>
          <mesh
            position={[-hipX, -1.5 * height * legLength, 0.16]}
            scale={[0.48 * morphs.footSize * build, 0.55 * height, 0.78 * morphs.footSize]}
            castShadow
          >
            <boxGeometry args={[1, 1, 1]} />
            <Surface color={appearance.boots} roughness={0.78} />
          </mesh>
          <mesh
            position={[hipX, -1.5 * height * legLength, 0.16]}
            scale={[0.48 * morphs.footSize * build, 0.55 * height, 0.78 * morphs.footSize]}
            castShadow
          >
            <boxGeometry args={[1, 1, 1]} />
            <Surface color={appearance.boots} roughness={0.78} />
          </mesh>
        </>
      )}

      {wardrobe.vest && (
        <mesh
          position={[0, torsoY + 0.08, 0.08]}
          scale={[
            1.02 * build * chest * shoulder,
            0.72 * height,
            0.59 * build * chestDepth
          ]}
          castShadow
        >
          <boxGeometry args={[1.3, 1.45, 0.95]} />
          <Surface color={appearance.vest} roughness={0.92} />
        </mesh>
      )}

      {wardrobe.headwear && (
        <mesh
          position={[0, headY + 0.36 * head, 0]}
          scale={[0.72 * head * cranium, 0.26 * head, 0.72 * head * cranium]}
          castShadow
        >
          <sphereGeometry args={[0.78, 32, 20]} />
          <Surface color={appearance.vest} roughness={0.8} />
        </mesh>
      )}

      {wardrobe.eyewear && (
        <mesh
          position={[0, headY + 0.02 * head, 0.49 * head * (alien ? cranium : 1)]}
          scale={[0.48 * head * eyeScale, 0.11 * head, 0.04]}
          castShadow
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#141922" roughness={0.2} metalness={0.08} transparent opacity={0.82} />
        </mesh>
      )}

      {wardrobe.gloves && (
        <>
          <mesh
            position={[-armX - 0.86 * morphs.armLength, shoulderY, 0]}
            scale={[0.2 * morphs.handSize, 0.28 * morphs.handSize, 0.13 * morphs.handSize]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <boxGeometry args={[1, 1, 1]} />
            <Surface color={appearance.boots} roughness={0.84} />
          </mesh>
          <mesh
            position={[armX + 0.86 * morphs.armLength, shoulderY, 0]}
            scale={[0.2 * morphs.handSize, 0.28 * morphs.handSize, 0.13 * morphs.handSize]}
            rotation={[0, 0, Math.PI / 2]}
            castShadow
          >
            <boxGeometry args={[1, 1, 1]} />
            <Surface color={appearance.boots} roughness={0.84} />
          </mesh>
        </>
      )}

      {wardrobe.belt && (
        <mesh
          position={[0, 0.83 * height, 0]}
          scale={[0.83 * build * waist, 0.08, 0.56 * build * waistDepth]}
          castShadow
        >
          <boxGeometry args={[1.4, 0.6, 0.9]} />
          <Surface color={appearance.boots} roughness={0.76} />
        </mesh>
      )}

      {wardrobe.gear && (
        <group position={[0, torsoY - 0.05, 0.54 * build * chestDepth]}>
          <mesh position={[-0.36, 0.05, 0]} scale={[0.22, 0.28, 0.12]} castShadow>
            <boxGeometry args={[1, 1, 1]} />
            <Surface color={appearance.vest} roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.02, 0]} scale={[0.22, 0.31, 0.12]} castShadow>
            <boxGeometry args={[1, 1, 1]} />
            <Surface color={appearance.vest} roughness={0.9} />
          </mesh>
          <mesh position={[0.36, 0.05, 0]} scale={[0.22, 0.28, 0.12]} castShadow>
            <boxGeometry args={[1, 1, 1]} />
            <Surface color={appearance.vest} roughness={0.9} />
          </mesh>
        </group>
      )}

      {appearance.markingsOpacity > 0.02 && (
        <mesh
          position={[0, torsoY + 0.02, 0.5 * chestDepth]}
          scale={[0.45 * chest, 0.45, 0.025]}
        >
          <sphereGeometry args={[0.8, 24, 16]} />
          <meshStandardMaterial
            color={appearance.markings}
            transparent
            opacity={appearance.markingsOpacity * 0.6}
            roughness={0.7}
          />
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
          <p>
            {character.lane} · {character.style} · {character.renderTarget}
          </p>
        </div>
        <span className="live-badge">LIVE</span>
      </div>

      <div className="viewport-canvas">
        <Canvas shadows camera={{ position: [6.7, 3.2, 7.2], fov: 38 }}>
          <color attach="background" args={['#11151d']} />
          <ambientLight intensity={1.2} />
          <directionalLight
            castShadow
            intensity={3.1}
            position={[4, 8, 5]}
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <directionalLight intensity={1.25} position={[-5, 3, -4]} />
          <CharacterMesh character={character} />
          <gridHelper args={[18, 18, '#303846', '#202630']} position={[0, -2.05, 0]} />
          <ContactShadows position={[0, -2.03, 0]} opacity={0.38} scale={10} blur={2.5} far={6} />
          <OrbitControls
            makeDefault
            target={[0, 0.7, 0]}
            minDistance={4.5}
            maxDistance={13}
            enablePan
          />
        </Canvas>
      </div>
    </section>
  );
}
