import { ContactShadows, OrbitControls, useGLTF } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useState } from 'react';
import {
  ACESFilmicToneMapping,
  Box3,
  Group,
  SRGBColorSpace,
  Vector3
} from 'three';
import type { CharacterState } from '../types/character';
import CanonicalBody from './CanonicalBody';
import MakeHumanBody from './MakeHumanBody';
import RigOverlay from './RigOverlay';
import { POSES, POSE_LABELS, type PosePreset } from '../lib/pose';

type CameraView = 'front' | 'threeQuarter' | 'side' | 'back' | 'face';
type LightingPreset = 'studio' | 'beauty' | 'dramatic' | 'flat';

interface LightingState {
  key: number;
  fill: number;
  rim: number;
  ambient: number;
  exposure: number;
  background: string;
}

const LIGHTING: Record<LightingPreset, LightingState> = {
  studio: { key: 4.2, fill: 1.45, rim: 2.1, ambient: 0.42, exposure: 1.02, background: '#10141b' },
  beauty: { key: 3.3, fill: 2.0, rim: 1.4, ambient: 0.58, exposure: 1.08, background: '#171719' },
  dramatic: { key: 5.4, fill: 0.52, rim: 3.2, ambient: 0.24, exposure: 0.94, background: '#080a0f' },
  flat: { key: 2.5, fill: 2.35, rim: 0.8, ambient: 0.82, exposure: 1.0, background: '#171b22' }
};

const CAMERA_POSITIONS: Record<CameraView, [number, number, number]> = {
  front: [0, 0.28, 8.6],
  threeQuarter: [5.2, 0.38, 6.4],
  side: [8.7, 0.28, 0],
  back: [0, 0.28, -8.6],
  face: [0, 1.55, 3.25]
};

function RendererSettings({ exposure }: { exposure: number }) {
  const { gl } = useThree();
  useEffect(() => {
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = exposure;
    gl.outputColorSpace = SRGBColorSpace;
  }, [gl, exposure]);
  return null;
}

function CameraController({ view }: { view: CameraView }) {
  const { camera } = useThree();
  useEffect(() => {
    const position = CAMERA_POSITIONS[view];
    const target = view === 'face' ? new Vector3(0, 1.58, 0) : new Vector3(0, 0.12, 0);
    camera.position.set(...position);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
  }, [camera, view]);
  return null;
}

function LightingRig({ lighting }: { lighting: LightingState }) {
  return (
    <>
      <hemisphereLight args={['#eef3ff', '#342b26', lighting.ambient]} />
      <spotLight
        castShadow
        intensity={lighting.key}
        position={[4.8, 6.8, 5.4]}
        angle={0.5}
        penumbra={0.82}
        decay={1.5}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <spotLight intensity={lighting.fill} position={[-4.2, 3.4, 4.3]} angle={0.72} penumbra={0.9} decay={1.3} />
      <spotLight intensity={lighting.rim} position={[-1.7, 4.5, -5.2]} angle={0.48} penumbra={0.76} decay={1.35} />
      <pointLight intensity={0.4 + lighting.fill * 0.12} position={[0, 1.8, 2.5]} />
    </>
  );
}

function ProceduralEyes({ character }: { character: CharacterState }) {
  const y = 2.52 * character.morphs.height * character.morphs.torsoLength;
  const x = 0.11 * character.morphs.eyeSpacing;
  const z = 0.43 * character.morphs.faceDepth;
  const scale = 0.84 + character.morphs.eyeScale * 0.18;

  return (
    <group>
      {[-1, 1].map((sign) => (
        <group key={sign} position={[sign * x, y, z]} scale={[scale, scale, scale]}>
          <mesh scale={[1.08, 0.72, 0.58]}>
            <sphereGeometry args={[0.07, 28, 20]} />
            <meshPhysicalMaterial color={character.appearance.sclera} roughness={0.32} />
          </mesh>
          <mesh position={[0, 0, 0.043]}>
            <circleGeometry args={[0.029, 32]} />
            <meshPhysicalMaterial color={character.appearance.eyes} roughness={0.25} clearcoat={0.35} />
          </mesh>
          <mesh position={[0, 0, 0.046]}>
            <circleGeometry args={[0.013, 28]} />
            <meshBasicMaterial color="#050607" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function CharacterMesh({
  character,
  posePreset,
  makeHumanObj
}: {
  character: CharacterState;
  posePreset: PosePreset;
  makeHumanObj?: string | null;
}) {
  if (makeHumanObj && character.lane !== 'alien') {
    return (
      <MakeHumanBody
        objText={makeHumanObj}
        character={character}
        poseName={posePreset === 'tPose' ? 'bind' : posePreset}
      />
    );
  }

  return (
    <group position={[0, -0.2, 0]}>
      <CanonicalBody character={character} pose={POSES[posePreset]} />
      <ProceduralEyes character={character} />
    </group>
  );
}

function AlignedAIEvidence({ url, character }: { url: string; character: CharacterState }) {
  const gltf = useGLTF(url);
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  const target = useMemo(() => {
    const headY =
      2.85 * character.morphs.height * character.morphs.torsoLength +
      (character.morphs.neckLength - 1) * 0.18 -
      0.2;
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
      const mesh = object as unknown as {
        isMesh?: boolean;
        castShadow?: boolean;
        receiveShadow?: boolean;
        material?: any;
      };
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const sources = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const materials = sources.map((source: any) => {
        const material = source?.clone ? source.clone() : source;
        if (material) {
          material.transparent = true;
          material.opacity = 0.25;
          material.depthWrite = false;
        }
        return material;
      });
      mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
    });
  }, [scene, target]);

  return <primitive object={scene as Group} />;
}

export default function CharacterViewport({
  character,
  posePreset,
  onPoseChange,
  showSkeleton,
  aiMeshUrl = null,
  showAiEvidence = false,
  makeHumanObj = null
}: {
  character: CharacterState;
  posePreset: PosePreset;
  onPoseChange: (pose: PosePreset) => void;
  showSkeleton: boolean;
  aiMeshUrl?: string | null;
  showAiEvidence?: boolean;
  makeHumanObj?: string | null;
}) {
  const [lightingPreset, setLightingPreset] = useState<LightingPreset>('studio');
  const [lighting, setLighting] = useState<LightingState>(LIGHTING.studio);
  const [cameraView, setCameraView] = useState<CameraView>('front');

  const setPreset = (preset: LightingPreset) => {
    setLightingPreset(preset);
    setLighting({ ...LIGHTING[preset] });
  };

  const setLight = (key: keyof LightingState, value: number | string) =>
    setLighting((current) => ({ ...current, [key]: value }));

  const target = cameraView === 'face' ? [0, 1.58, 0] as [number, number, number] : [0, 0.12, 0] as [number, number, number];

  return (
    <section className="panel viewport-panel studio-viewport">
      <div className="panel-header viewport-header">
        <div>
          <span className="eyebrow">Live character preview</span>
          <h2>{character.name}</h2>
          <p>{character.lane} · {character.style} · {makeHumanObj && character.lane !== 'alien' ? 'canonical HM08 provider' : 'canonical fallback'}</p>
        </div>
        <span className="live-badge">LIVE</span>
      </div>

      <div className="studio-toolbar">
        <div className="toolbar-group">
          <span>Camera</span>
          {(['front', 'threeQuarter', 'side', 'back', 'face'] as CameraView[]).map((view) => (
            <button key={view} type="button" className={cameraView === view ? 'active' : ''} onClick={() => setCameraView(view)}>
              {view === 'threeQuarter' ? '3/4' : view}
            </button>
          ))}
        </div>
        <div className="toolbar-group">
          <span>Light</span>
          {(['studio', 'beauty', 'dramatic', 'flat'] as LightingPreset[]).map((preset) => (
            <button key={preset} type="button" className={lightingPreset === preset ? 'active' : ''} onClick={() => setPreset(preset)}>
              {preset}
            </button>
          ))}
        </div>
      </div>

      <div className="studio-light-controls">
        {([
          ['key', 'Key', 0, 7],
          ['fill', 'Fill', 0, 5],
          ['rim', 'Rim', 0, 5],
          ['exposure', 'Exposure', 0.45, 1.55]
        ] as Array<[keyof LightingState, string, number, number]>).map(([key, label, min, max]) => (
          <label key={key}>
            <span>{label}</span>
            <input
              type="range"
              min={min}
              max={max}
              step="0.01"
              value={Number(lighting[key])}
              onChange={(event) => setLight(key, Number(event.target.value))}
            />
          </label>
        ))}
      </div>

      <div className="pose-strip studio-pose-strip">
        {(Object.keys(POSES) as PosePreset[]).slice(0, 6).map((preset) => (
          <button key={preset} type="button" className={posePreset === preset ? 'active' : ''} onClick={() => onPoseChange(preset)}>
            {POSE_LABELS[preset]}
          </button>
        ))}
      </div>

      <div className="viewport-canvas">
        <Canvas shadows camera={{ position: CAMERA_POSITIONS.front, fov: 32 }}>
          <color attach="background" args={[lighting.background]} />
          <RendererSettings exposure={lighting.exposure} />
          <CameraController view={cameraView} />
          <LightingRig lighting={lighting} />

          <CharacterMesh character={character} posePreset={posePreset} makeHumanObj={makeHumanObj} />

          {showSkeleton && <RigOverlay character={character} pose={POSES[posePreset]} />}

          {aiMeshUrl && showAiEvidence && (
            <Suspense fallback={null}>
              <AlignedAIEvidence url={aiMeshUrl} character={character} />
            </Suspense>
          )}

          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.055, 0]} receiveShadow>
            <planeGeometry args={[18, 18]} />
            <meshStandardMaterial color="#141820" roughness={0.96} metalness={0} />
          </mesh>
          <gridHelper args={[18, 18, '#2f3745', '#202630']} position={[0, -2.045, 0]} />
          <ContactShadows position={[0, -2.035, 0]} opacity={0.34} scale={10} blur={2.8} far={6} />

          <OrbitControls makeDefault target={target} minDistance={2.4} maxDistance={13} enablePan />
        </Canvas>
      </div>
    </section>
  );
}
