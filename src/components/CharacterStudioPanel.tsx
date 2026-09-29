import { useMemo } from 'react';
import { applyStyle, defaultsForLane } from '../data/characterProfiles';
import { canonicalJoints } from '../lib/canonicalRig';
import { POSES, POSE_LABELS, type PosePreset } from '../lib/pose';
import type {
  AppearanceState,
  AnatomyMode,
  CharacterLane,
  CharacterState,
  CharacterStyle,
  DetailLayerState,
  MakeHumanMacroState
} from '../types/character';
import type { WorkspaceId } from './WorkspaceNav';
import MakeHumanAssetLibrary from './MakeHumanAssetLibrary';
import NativeMakeHumanControls from './NativeMakeHumanControls';

interface Props {
  mode: Exclude<WorkspaceId, 'reference'>;
  character: CharacterState;
  onChange: (next: CharacterState) => void;
  onReset: () => void;
  posePreset: PosePreset;
  onPoseChange: (pose: PosePreset) => void;
  showSkeleton: boolean;
  onShowSkeletonChange: (value: boolean) => void;
  onSave: () => void;
  onOpenBlender: () => void;
  blenderReady: boolean;
}

const MACROS: Array<{ key: keyof MakeHumanMacroState; label: string; femaleOnly?: boolean }> = [
  { key: 'age', label: 'Age' },
  { key: 'muscle', label: 'Muscle' },
  { key: 'weight', label: 'Weight' },
  { key: 'proportions', label: 'Proportions' },
  { key: 'breastSize', label: 'Breast size', femaleOnly: true },
  { key: 'breastFirmness', label: 'Breast firmness', femaleOnly: true }
];

const APPEARANCE_SLIDERS: Array<{ key: keyof AppearanceState; label: string; min: number; max: number }> = [
  { key: 'skinRoughness', label: 'Skin roughness', min: 0.18, max: 0.95 },
  { key: 'skinSubsurface', label: 'Skin softness / SSS', min: 0, max: 0.6 },
  { key: 'skinSpecular', label: 'Skin specular', min: 0, max: 1 },
  { key: 'skinOiliness', label: 'Skin oiliness', min: 0, max: 1 },
  { key: 'poreDetail', label: 'Pore / micro detail', min: 0, max: 1 },
  { key: 'freckles', label: 'Freckles', min: 0, max: 1 },
  { key: 'moles', label: 'Moles', min: 0, max: 1 },
  { key: 'scars', label: 'Scars', min: 0, max: 1 },
  { key: 'makeup', label: 'Makeup', min: 0, max: 1 },
  { key: 'bodyHair', label: 'Body hair', min: 0, max: 1 }
];

const EYE_SLIDERS: Array<{ key: keyof AppearanceState; label: string }> = [
  { key: 'eyePupilScale', label: 'Pupil size' },
  { key: 'eyeLimbalRing', label: 'Limbal ring' },
  { key: 'eyeWetness', label: 'Cornea / wetness' }
];

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="color-control">
      <span>{label}</span>
      <input type="color" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Slider({ label, value, min = 0, max = 1, onChange }: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="range-control">
      <span><strong>{label}</strong><output>{value.toFixed(2)}</output></span>
      <input type="range" min={min} max={max} step="0.01" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

export default function CharacterStudioPanel({
  mode,
  character,
  onChange,
  onReset,
  posePreset,
  onPoseChange,
  showSkeleton,
  onShowSkeletonChange,
  onSave,
  onOpenBlender,
  blenderReady
}: Props) {
  const updateAppearance = <K extends keyof AppearanceState>(key: K, value: AppearanceState[K]) =>
    onChange({ ...character, appearance: { ...character.appearance, [key]: value } });

  const setMacro = (key: keyof MakeHumanMacroState, value: number) =>
    onChange({
      ...character,
      macro: { ...character.macro, [key]: value },
      anatomy: key === 'age' && value < 0.5 ? { ...character.anatomy, mode: 'off' } : character.anatomy
    });

  const changeLane = (lane: CharacterLane) => onChange(defaultsForLane(lane, character.style, character));
  const changeStyle = (style: CharacterStyle) => onChange(applyStyle(style, character));

  const tattoo = character.details.find((detail) => detail.type === 'tattoo') ?? character.details[0];

  const setTattoo = (patch: Partial<DetailLayerState>) => {
    const index = character.details.findIndex((detail) => detail.id === tattoo?.id);
    if (index < 0) return;
    const details = [...character.details];
    details[index] = { ...details[index], ...patch };
    onChange({ ...character, details });
  };

  const rigJoints = useMemo(() => canonicalJoints(character), [character]);
  const rigHealthy = character.rigCharacter && rigJoints.length >= 23;

  if (mode === 'create') {
    return (
      <section className="panel studio-inspector-panel">
        <div className="studio-section-heading">
          <span className="eyebrow">Character source</span>
          <h2>Create character</h2>
          <p>One editable character. Manual controls and photo matching both update this same state.</p>
        </div>
        <div className="studio-control-body">
          <div className="segmented-control">
            {(['male', 'female', 'alien'] as CharacterLane[]).map((lane) => (
              <button key={lane} type="button" className={character.lane === lane ? 'active' : ''} onClick={() => changeLane(lane)}>
                {lane}
              </button>
            ))}
          </div>
          <div className="segmented-control style-control">
            {([['stylized', 'Stylized'], ['semiReal', 'Semi-real'], ['realHuman', 'Realistic']] as Array<[CharacterStyle, string]>).map(([style, label]) => (
              <button key={style} type="button" className={character.style === style ? 'active' : ''} onClick={() => changeStyle(style)}>
                {label}
              </button>
            ))}
          </div>
          <div className="creator-note">
            <strong>Character engine</strong>
            <span>Editable canonical topology with MakeHuman HM08 as a backend provider. The product identity stays 3D Builder.</span>
          </div>
          <button className="secondary-button" type="button" onClick={onReset}>Reset this character</button>
        </div>
      </section>
    );
  }

  if (mode === 'shape') {
    return (
      <section className="panel studio-inspector-panel">
        <div className="studio-section-heading">
          <span className="eyebrow">Shape</span>
          <h2>Body & face</h2>
          <p>Use broad phenotype controls first, then refine native face, torso, limb and measurement targets.</p>
        </div>
        <div className="studio-subsection">
          <div className="subsection-title"><strong>Main proportions</strong><span>Broad body controls</span></div>
          <div className="control-stack">
            {MACROS.filter(({ femaleOnly }) => !femaleOnly || character.lane === 'female').map(({ key, label }) => (
              <Slider key={key} label={label} value={character.macro[key]} onChange={(value) => setMacro(key, value)} />
            ))}
            <Slider
              label="Height"
              value={character.morphs.height}
              min={0.78}
              max={1.24}
              onChange={(value) => onChange({ ...character, morphs: { ...character.morphs, height: value } })}
            />
          </div>
        </div>
        {character.lane !== 'alien' ? (
          <NativeMakeHumanControls character={character} onChange={onChange} />
        ) : (
          <div className="mh-native-empty">Alien shaping continues to use the custom canonical morph lane.</div>
        )}
      </section>
    );
  }

  if (mode === 'appearance') {
    return (
      <section className="panel studio-inspector-panel">
        <div className="studio-section-heading">
          <span className="eyebrow">Appearance</span>
          <h2>Skin, eyes, hair & details</h2>
          <p>Preview-grade physical materials, layered eyes, human detail controls and projected tattoo artwork.</p>
        </div>

        <div className="studio-subsection">
          <div className="subsection-title"><strong>Skin</strong><span>Physical surface</span></div>
          <div className="color-grid">
            <ColorInput label="Skin" value={character.appearance.skin} onChange={(value) => updateAppearance('skin', value)} />
            <ColorInput label="Undertone" value={character.appearance.skinSecondary} onChange={(value) => updateAppearance('skinSecondary', value)} />
            <ColorInput label="Lips" value={character.appearance.lips} onChange={(value) => updateAppearance('lips', value)} />
            <ColorInput label="Brows" value={character.appearance.brows} onChange={(value) => updateAppearance('brows', value)} />
          </div>
          <div className="control-stack surface-controls">
            {APPEARANCE_SLIDERS.map(({ key, label, min, max }) => (
              <Slider
                key={key}
                label={label}
                value={Number(character.appearance[key])}
                min={min}
                max={max}
                onChange={(value) => updateAppearance(key, value as never)}
              />
            ))}
          </div>
        </div>

        <div className="studio-subsection">
          <div className="subsection-title"><strong>Eyes</strong><span>Sclera · iris · cornea</span></div>
          <div className="color-grid">
            <ColorInput label="Iris" value={character.appearance.eyes} onChange={(value) => updateAppearance('eyes', value)} />
            <ColorInput label="Sclera" value={character.appearance.sclera} onChange={(value) => updateAppearance('sclera', value)} />
          </div>
          <div className="control-stack">
            {EYE_SLIDERS.map(({ key, label }) => (
              <Slider key={key} label={label} value={Number(character.appearance[key])} onChange={(value) => updateAppearance(key, value as never)} />
            ))}
          </div>
        </div>

        <div className="studio-subsection">
          <div className="subsection-title"><strong>Hair</strong><span>Asset slot + fallback preview</span></div>
          <div className="toggle-row detail-toggle">
            <label><input type="checkbox" checked={character.appearance.hairEnabled} onChange={(event) => updateAppearance('hairEnabled', event.target.checked)} /><span>Hair enabled</span></label>
          </div>
          {character.appearance.hairEnabled && (
            <>
              <div className="color-grid">
                <ColorInput label="Hair" value={character.appearance.hair} onChange={(value) => updateAppearance('hair', value)} />
              </div>
              <div className="control-stack">
                <label className="select-control">
                  <span>Fallback hairstyle</span>
                  <select value={character.appearance.hairStyle} onChange={(event) => updateAppearance('hairStyle', event.target.value as AppearanceState['hairStyle'])}>
                    <option value="buzz">Buzz</option>
                    <option value="short">Short</option>
                    <option value="sidePart">Side part</option>
                    <option value="curly">Curly</option>
                    <option value="afro">Afro</option>
                    <option value="bob">Bob</option>
                    <option value="long">Long</option>
                    <option value="ponytail">Ponytail</option>
                    <option value="bun">Bun</option>
                    <option value="braids">Braids</option>
                  </select>
                </label>
                <Slider label="Hair length" value={character.appearance.hairLength} onChange={(value) => updateAppearance('hairLength', value)} />
                <Slider label="Hair volume" value={character.appearance.hairVolume} onChange={(value) => updateAppearance('hairVolume', value)} />
                <Slider label="Hair gloss" value={character.appearance.hairGloss} onChange={(value) => updateAppearance('hairGloss', value)} />
                <Slider label="Root darkening" value={character.appearance.hairRootDarkening} onChange={(value) => updateAppearance('hairRootDarkening', value)} />
              </div>
              <div className="creator-note compact">
                Installed hair assets override the fallback preview. Choose a real mesh below whenever one is available.
              </div>
              <MakeHumanAssetLibrary character={character} onChange={onChange} initialView="hair" />
            </>
          )}
        </div>

        {tattoo && (
          <div className="studio-subsection">
            <div className="subsection-title"><strong>Tattoo / decal</strong><span>Body-space detail layer</span></div>
            <div className="toggle-row detail-toggle">
              <label><input type="checkbox" checked={tattoo.enabled} onChange={(event) => setTattoo({ enabled: event.target.checked })} /><span>Enable tattoo</span></label>
            </div>
            {tattoo.enabled && (
              <>
                <div className="color-grid">
                  <ColorInput label="Ink" value={tattoo.color} onChange={(value) => setTattoo({ color: value })} />
                </div>
                <label className="file-control">
                  <span>Custom tattoo image</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => setTattoo({ imageDataUrl: String(reader.result ?? '') });
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
                <div className="control-stack">
                  <Slider label="Opacity" value={tattoo.opacity} onChange={(value) => setTattoo({ opacity: value })} />
                  <Slider label="Horizontal" value={tattoo.positionX} min={-1} max={1} onChange={(value) => setTattoo({ positionX: value })} />
                  <Slider label="Vertical" value={tattoo.positionY} min={-1} max={1} onChange={(value) => setTattoo({ positionY: value })} />
                  <Slider label="Scale" value={tattoo.scale} min={0.15} max={1.4} onChange={(value) => setTattoo({ scale: value })} />
                  <Slider label="Rotation" value={tattoo.rotation} min={-3.14} max={3.14} onChange={(value) => setTattoo({ rotation: value })} />
                </div>
              </>
            )}
          </div>
        )}

        {character.lane !== 'alien' && (
          <div className="studio-subsection">
            <div className="subsection-title"><strong>Anatomy asset</strong><span>Native mesh only</span></div>
            <div className="segmented-control">
              {(['off', 'simplified', 'detailed'] as AnatomyMode[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={character.anatomy.mode === value ? 'active' : ''}
                  onClick={() => onChange({ ...character, anatomy: { ...character.anatomy, mode: value } })}
                >
                  {value}
                </button>
              ))}
            </div>
            <div className="creator-note compact">
              Procedural glued-on anatomy has been removed. Detailed mode now uses installed native anatomy geometry and real morph targets only.
            </div>
          </div>
        )}
      </section>
    );
  }

  if (mode === 'clothing') {
    return (
      <section className="panel studio-inspector-panel">
        <div className="studio-section-heading">
          <span className="eyebrow">Clothing</span>
          <h2>Wardrobe & character assets</h2>
          <p>Equip fitted MakeHuman geometry on the same body. Hair and anatomy are handled as exclusive character slots.</p>
        </div>
        <div className="color-grid">
          <ColorInput label="Shirt" value={character.appearance.shirt} onChange={(value) => updateAppearance('shirt', value)} />
          <ColorInput label="Pants" value={character.appearance.pants} onChange={(value) => updateAppearance('pants', value)} />
          <ColorInput label="Boots" value={character.appearance.boots} onChange={(value) => updateAppearance('boots', value)} />
          <ColorInput label="Outerwear" value={character.appearance.vest} onChange={(value) => updateAppearance('vest', value)} />
        </div>
        <MakeHumanAssetLibrary character={character} onChange={onChange} />
      </section>
    );
  }

  if (mode === 'poseRig') {
    return (
      <section className="panel studio-inspector-panel">
        <div className="studio-section-heading">
          <span className="eyebrow">Pose / Rig</span>
          <h2>Deformation workbench</h2>
          <p>Pose the actual character skeleton and expose the rig while checking shoulders, elbows, hips, knees, spine and neck.</p>
        </div>
        <div className="rig-health-card">
          <div><span>Skeleton</span><strong>{rigJoints.length} canonical joints</strong></div>
          <div><span>Skinning</span><strong>{character.rigCharacter ? 'Enabled' : 'Disabled'}</strong></div>
          <div><span>Status</span><strong className={rigHealthy ? 'health-good' : 'health-warn'}>{rigHealthy ? 'Ready for QA' : 'Needs attention'}</strong></div>
        </div>
        <label className="setting-check rig-toggle">
          <input type="checkbox" checked={character.rigCharacter} onChange={(event) => onChange({ ...character, rigCharacter: event.target.checked })} />
          <span><strong>Rig character</strong><small>Keep the humanoid armature and skin weights in the production recipe.</small></span>
        </label>
        <label className="setting-check rig-toggle">
          <input type="checkbox" checked={showSkeleton} onChange={(event) => onShowSkeletonChange(event.target.checked)} />
          <span><strong>Show skeleton</strong><small>Draw the live joint hierarchy over the character.</small></span>
        </label>
        <div className="pose-grid">
          {(Object.keys(POSES) as PosePreset[]).map((preset) => (
            <button key={preset} type="button" className={posePreset === preset ? 'active' : ''} onClick={() => onPoseChange(preset)}>
              {POSE_LABELS[preset]}
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="panel studio-inspector-panel">
      <div className="studio-section-heading">
        <span className="eyebrow">Export</span>
        <h2>Production handoff</h2>
        <p>Save the editable character recipe or open the current body with its armature and weights in Blender.</p>
      </div>
      <div className="output-settings">
        <label className="select-control">
          <span>Output target</span>
          <select value={character.renderTarget} onChange={(event) => onChange({ ...character, renderTarget: event.target.value as CharacterState['renderTarget'] })}>
            <option value="general">General / GLB</option>
            <option value="unreal">Unreal / FBX</option>
            <option value="print">3D print / OBJ/STL</option>
          </select>
        </label>
        <label className="setting-check">
          <input type="checkbox" checked={character.generateTextures} onChange={(event) => onChange({ ...character, generateTextures: event.target.checked })} />
          <span><strong>Include material intent</strong><small>Preserve skin, eye, hair and wardrobe material settings in the recipe.</small></span>
        </label>
        <label className="setting-check">
          <input type="checkbox" checked={character.blenderCleanup} onChange={(event) => onChange({ ...character, blenderCleanup: event.target.checked })} />
          <span><strong>Blender cleanup</strong><small>Prepare the character for target-specific cleanup after import.</small></span>
        </label>
        <button className="primary-button" type="button" onClick={onSave}>Save editable character</button>
        <button className="secondary-button" type="button" disabled={!blenderReady} onClick={onOpenBlender}>
          {blenderReady ? 'Open rigged character in Blender' : 'Blender not detected'}
        </button>
        <div className="creator-note compact">
          The Blender handoff contains the body armature and skin weights. Clothing/hair export binding is the next export-specific pass.
        </div>
      </div>
    </section>
  );
}
