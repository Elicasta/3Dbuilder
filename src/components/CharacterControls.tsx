import { MORPH_CONTROLS, applyStyle, defaultsForLane } from '../data/characterProfiles';
import { WARDROBE } from '../data/wardrobe';
import type {
  AppearanceState,
  BodyMorphs,
  CharacterLane,
  CharacterState,
  CharacterStyle,
  WardrobeSlot
} from '../types/character';

interface CharacterControlsProps {
  character: CharacterState;
  onChange: (next: CharacterState) => void;
  onReset: () => void;
}

const COLORS: Array<{ key: keyof Pick<AppearanceState,
  'skin' | 'skinSecondary' | 'eyes' | 'sclera' | 'hair' | 'brows' | 'lips' | 'markings' |
  'underwear' | 'shirt' | 'pants' | 'boots' | 'vest'>; label: string }> = [
  { key: 'skin', label: 'Skin' },
  { key: 'skinSecondary', label: 'Skin secondary' },
  { key: 'eyes', label: 'Iris / eye' },
  { key: 'sclera', label: 'Sclera' },
  { key: 'hair', label: 'Hair' },
  { key: 'brows', label: 'Brows' },
  { key: 'lips', label: 'Lips' },
  { key: 'markings', label: 'Markings' },
  { key: 'underwear', label: 'Base layer' },
  { key: 'shirt', label: 'Shirt' },
  { key: 'pants', label: 'Pants' },
  { key: 'boots', label: 'Boots' },
  { key: 'vest', label: 'Vest' }
];

const SURFACE_CONTROLS: Array<{
  key: keyof Pick<AppearanceState, 'skinRoughness' | 'skinSubsurface' | 'freckles' | 'markingsOpacity'>;
  label: string;
  min: number;
  max: number;
}> = [
  { key: 'skinRoughness', label: 'Skin roughness', min: 0.2, max: 0.95 },
  { key: 'skinSubsurface', label: 'Skin subsurface', min: 0, max: 0.55 },
  { key: 'freckles', label: 'Freckles / detail', min: 0, max: 1 },
  { key: 'markingsOpacity', label: 'Markings', min: 0, max: 1 }
];

export default function CharacterControls({
  character,
  onChange,
  onReset
}: CharacterControlsProps) {
  const morphControls = MORPH_CONTROLS[character.lane];

  const updateMorph = (key: keyof BodyMorphs, value: number) => {
    onChange({
      ...character,
      morphs: { ...character.morphs, [key]: value }
    });
  };

  const updateAppearance = <K extends keyof AppearanceState,>(
    key: K,
    value: AppearanceState[K]
  ) => {
    onChange({
      ...character,
      appearance: { ...character.appearance, [key]: value }
    });
  };

  const toggleWardrobe = (slot: WardrobeSlot) => {
    onChange({
      ...character,
      wardrobe: {
        ...character.wardrobe,
        [slot]: !character.wardrobe[slot]
      }
    });
  };

  const changeLane = (lane: CharacterLane) => {
    onChange(defaultsForLane(lane, character.style, character));
  };

  const changeStyle = (style: CharacterStyle) => {
    onChange(applyStyle(style, character));
  };

  return (
    <>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Character Profile</h2>
            <p>Lane and style choose the canonical body family we fit into.</p>
          </div>
        </div>

        <div className="profile-controls">
          <div className="segmented-control" aria-label="Character lane">
            {(['male', 'female', 'alien'] as CharacterLane[]).map((lane) => (
              <button
                type="button"
                key={lane}
                className={character.lane === lane ? 'active' : ''}
                onClick={() => changeLane(lane)}
              >
                {lane}
              </button>
            ))}
          </div>

          <div className="segmented-control style-control" aria-label="Character style">
            {([
              ['stylized', 'Stylized'],
              ['semiReal', 'Semi-real'],
              ['realHuman', 'Real human']
            ] as Array<[CharacterStyle, string]>).map(([style, label]) => (
              <button
                type="button"
                key={style}
                className={character.style === style ? 'active' : ''}
                onClick={() => changeStyle(style)}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="select-control">
            <span>Output target</span>
            <select
              value={character.renderTarget}
              onChange={(event) =>
                onChange({
                  ...character,
                  renderTarget: event.target.value as CharacterState['renderTarget']
                })
              }
            >
              <option value="general">General / GLB</option>
              <option value="unreal">Unreal / FBX</option>
              <option value="print">3D print / STL</option>
            </select>
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header split-header">
          <div>
            <h2>{character.lane === 'alien' ? 'Alien Body' : 'Body & Proportions'}</h2>
            <p>{morphControls.length} live controls for this lane.</p>
          </div>
          <button className="ghost-button" type="button" onClick={onReset}>
            Reset lane
          </button>
        </div>

        <div className="control-stack">
          {morphControls.map((morph) => (
            <label className="range-control" key={morph.key}>
              <span>
                <strong>{morph.label}</strong>
                <output>{character.morphs[morph.key].toFixed(2)}</output>
              </span>
              <input
                type="range"
                min={morph.min}
                max={morph.max}
                step={morph.step ?? 0.01}
                value={character.morphs[morph.key]}
                onChange={(event) => updateMorph(morph.key, Number(event.target.value))}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Appearance</h2>
            <p>Skin, eyes, hair, surface response, and lane-specific color detail.</p>
          </div>
        </div>

        <div className="toggle-row">
          <label>
            <input
              type="checkbox"
              checked={character.appearance.hairEnabled}
              onChange={(event) => updateAppearance('hairEnabled', event.target.checked)}
            />
            <span>Hair enabled</span>
          </label>
        </div>

        <div className="color-grid">
          {COLORS.map((color) => (
            <label className="color-control" key={color.key}>
              <span>{color.label}</span>
              <input
                type="color"
                value={character.appearance[color.key]}
                onChange={(event) => updateAppearance(color.key, event.target.value)}
              />
            </label>
          ))}
        </div>

        <div className="control-stack surface-controls">
          {SURFACE_CONTROLS.map((control) => (
            <label className="range-control" key={control.key}>
              <span>
                <strong>{control.label}</strong>
                <output>{character.appearance[control.key].toFixed(2)}</output>
              </span>
              <input
                type="range"
                min={control.min}
                max={control.max}
                step="0.01"
                value={character.appearance[control.key]}
                onChange={(event) =>
                  updateAppearance(control.key, Number(event.target.value))
                }
              />
            </label>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Wardrobe</h2>
            <p>Reusable slots stay separate from the canonical body.</p>
          </div>
        </div>

        <div className="wardrobe-grid">
          {WARDROBE.map((item) => (
            <button
              className={character.wardrobe[item.slot] ? 'wardrobe-card active' : 'wardrobe-card'}
              type="button"
              key={item.slot}
              onClick={() => toggleWardrobe(item.slot)}
              aria-pressed={character.wardrobe[item.slot]}
            >
              <span className="wardrobe-title">{item.label}</span>
              <span>{item.description}</span>
              <strong>{character.wardrobe[item.slot] ? 'On' : 'Off'}</strong>
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
