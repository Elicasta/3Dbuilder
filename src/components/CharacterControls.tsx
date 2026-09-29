import { WARDROBE } from '../data/wardrobe';
import type {
  BodyMorphs,
  CharacterColors,
  CharacterState,
  WardrobeSlot
} from '../types/character';

interface CharacterControlsProps {
  character: CharacterState;
  onChange: (next: CharacterState) => void;
  onReset: () => void;
}

const MORPHS: Array<{
  key: keyof BodyMorphs;
  label: string;
  min: number;
  max: number;
}> = [
  { key: 'height', label: 'Height', min: 0.82, max: 1.18 },
  { key: 'build', label: 'Build', min: 0.72, max: 1.32 },
  { key: 'shoulders', label: 'Shoulders', min: 0.75, max: 1.3 },
  { key: 'waist', label: 'Waist', min: 0.72, max: 1.28 },
  { key: 'legLength', label: 'Leg length', min: 0.82, max: 1.2 },
  { key: 'headScale', label: 'Head', min: 0.82, max: 1.2 }
];

const COLORS: Array<{ key: keyof CharacterColors; label: string }> = [
  { key: 'skin', label: 'Skin' },
  { key: 'hair', label: 'Hair' },
  { key: 'underwear', label: 'Base layer' },
  { key: 'shirt', label: 'Shirt' },
  { key: 'pants', label: 'Pants' },
  { key: 'boots', label: 'Boots' },
  { key: 'vest', label: 'Vest' }
];

export default function CharacterControls({
  character,
  onChange,
  onReset
}: CharacterControlsProps) {
  const updateMorph = (key: keyof BodyMorphs, value: number) => {
    onChange({
      ...character,
      morphs: { ...character.morphs, [key]: value }
    });
  };

  const updateColor = (key: keyof CharacterColors, value: string) => {
    onChange({
      ...character,
      colors: { ...character.colors, [key]: value }
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

  return (
    <>
      <section className="panel">
        <div className="panel-header split-header">
          <div>
            <h2>Body</h2>
            <p>Morphs drive the live base character.</p>
          </div>
          <button className="ghost-button" type="button" onClick={onReset}>
            Reset
          </button>
        </div>

        <div className="control-stack">
          {MORPHS.map((morph) => (
            <label className="range-control" key={morph.key}>
              <span>
                <strong>{morph.label}</strong>
                <output>{character.morphs[morph.key].toFixed(2)}</output>
              </span>
              <input
                type="range"
                min={morph.min}
                max={morph.max}
                step="0.01"
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
            <p>These are wired directly to 3D materials.</p>
          </div>
        </div>
        <div className="color-grid">
          {COLORS.map((color) => (
            <label className="color-control" key={color.key}>
              <span>{color.label}</span>
              <input
                type="color"
                value={character.colors[color.key]}
                onChange={(event) => updateColor(color.key, event.target.value)}
              />
            </label>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Wardrobe</h2>
            <p>Separate slots now exist for generated clothing and gear.</p>
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
