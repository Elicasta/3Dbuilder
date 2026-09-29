import { useState } from 'react';
import { applyStyle, defaultsForLane } from '../data/characterProfiles';
import NativeMakeHumanControls from './NativeMakeHumanControls';
import MakeHumanAssetLibrary from './MakeHumanAssetLibrary';
import type {
  AppearanceState,
  CharacterLane,
  CharacterState,
  CharacterStyle,
  MakeHumanMacroState
} from '../types/character';

interface CharacterControlsProps {
  character: CharacterState;
  onChange: (next: CharacterState) => void;
  onReset: () => void;
}

type EditorTab = 'modeling' | 'materials' | 'wardrobe' | 'output';

const COLORS: Array<{ key: keyof Pick<AppearanceState,
  'skin' | 'skinSecondary' | 'eyes' | 'sclera' | 'hair' | 'brows' | 'lips' | 'markings' |
  'underwear' | 'shirt' | 'pants' | 'boots' | 'vest'>; label: string }> = [
  { key: 'skin', label: 'Skin' }, { key: 'skinSecondary', label: 'Skin secondary' },
  { key: 'eyes', label: 'Iris' }, { key: 'sclera', label: 'Sclera' },
  { key: 'hair', label: 'Hair' }, { key: 'brows', label: 'Brows' },
  { key: 'lips', label: 'Lips' }, { key: 'markings', label: 'Markings' },
  { key: 'underwear', label: 'Base layer' }, { key: 'shirt', label: 'Shirt' },
  { key: 'pants', label: 'Pants' }, { key: 'boots', label: 'Boots' }, { key: 'vest', label: 'Vest' }
];

const SURFACE_CONTROLS = [
  { key: 'skinRoughness', label: 'Skin roughness', min: 0.2, max: 0.95 },
  { key: 'skinSubsurface', label: 'Skin subsurface', min: 0, max: 0.55 },
  { key: 'freckles', label: 'Freckles / detail', min: 0, max: 1 },
  { key: 'markingsOpacity', label: 'Markings', min: 0, max: 1 }
] as const;

const MACROS: Array<{ key: keyof MakeHumanMacroState; label: string; femaleOnly?: boolean }> = [
  { key: 'age', label: 'Age' },
  { key: 'muscle', label: 'Muscle' },
  { key: 'weight', label: 'Weight' },
  { key: 'proportions', label: 'Proportions' },
  { key: 'breastSize', label: 'Breast size', femaleOnly: true },
  { key: 'breastFirmness', label: 'Breast firmness', femaleOnly: true }
];

export default function CharacterControls({ character, onChange, onReset }: CharacterControlsProps) {
  const [tab, setTab] = useState<EditorTab>('modeling');
  const updateAppearance = <K extends keyof AppearanceState>(key: K, value: AppearanceState[K]) =>
    onChange({ ...character, appearance: { ...character.appearance, [key]: value } });
  const changeLane = (lane: CharacterLane) => onChange(defaultsForLane(lane, character.style, character));
  const changeStyle = (style: CharacterStyle) => onChange(applyStyle(style, character));
  const setMacro = (key: keyof MakeHumanMacroState, value: number) =>
    onChange({ ...character, macro: { ...character.macro, [key]: value } });

  return (
    <section className="panel makehuman-editor">
      <div className="mh-profile">
        <div className="mh-profile-title"><div><span className="eyebrow">MakeHuman hm08</span><h2>Character</h2></div>
          <button className="ghost-button" type="button" onClick={onReset}>Reset</button></div>
        <div className="segmented-control">
          {(['male','female','alien'] as CharacterLane[]).map((lane) => (
            <button key={lane} type="button" className={character.lane === lane ? 'active' : ''} onClick={() => changeLane(lane)}>{lane}</button>
          ))}
        </div>
        <div className="segmented-control style-control">
          {([['stylized','Stylized'],['semiReal','Semi-real'],['realHuman','Real human']] as Array<[CharacterStyle,string]>).map(([style,label]) => (
            <button key={style} type="button" className={character.style === style ? 'active' : ''} onClick={() => changeStyle(style)}>{label}</button>
          ))}
        </div>
      </div>

      <nav className="mh-editor-tabs">
        {([['modeling','Modeling'],['materials','Materials'],['wardrobe','Geometry'],['output','Output']] as Array<[EditorTab,string]>).map(([id,label]) => (
          <button key={id} type="button" className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>
        ))}
      </nav>

      {tab === 'modeling' && (
        <div className="mh-tab-body">
          {character.lane !== 'alien' && (
            <div className="mh-macro-panel">
              <div className="mh-pane-heading"><strong>Main</strong><span>Native MakeHuman phenotype dependencies.</span></div>
              <div className="control-stack">
                {MACROS.filter(({femaleOnly})=>!femaleOnly||character.lane==='female').map(({ key, label }) => (
                  <label className="range-control" key={key}>
                    <span><strong>{label}</strong><output>{character.macro[key].toFixed(2)}</output></span>
                    <input type="range" min="0" max="1" step="0.01" value={character.macro[key]}
                      onChange={(event) => setMacro(key, Number(event.target.value))} />
                  </label>
                ))}
                <label className="range-control">
                  <span><strong>Height</strong><output>{character.morphs.height.toFixed(2)}</output></span>
                  <input type="range" min="0.78" max="1.24" step="0.01" value={character.morphs.height}
                    onChange={(event) => onChange({ ...character, morphs: { ...character.morphs, height: Number(event.target.value) } })} />
                </label>
              </div>
            </div>
          )}
          {character.lane !== 'alien' ? <NativeMakeHumanControls character={character} onChange={onChange} /> :
            <div className="mh-native-empty">Alien modeling remains on the custom topology/morph lane.</div>}
        </div>
      )}

      {tab === 'materials' && (
        <div className="mh-tab-body">
          <div className="toggle-row"><label><input type="checkbox" checked={character.appearance.hairEnabled}
            onChange={(event) => updateAppearance('hairEnabled', event.target.checked)} /><span>Hair enabled</span></label></div>
          <div className="color-grid">{COLORS.map((color) => (
            <label className="color-control" key={color.key}><span>{color.label}</span>
              <input type="color" value={character.appearance[color.key]} onChange={(event) => updateAppearance(color.key, event.target.value)} /></label>
          ))}</div>
          <div className="control-stack surface-controls">{SURFACE_CONTROLS.map((control) => (
            <label className="range-control" key={control.key}><span><strong>{control.label}</strong><output>{character.appearance[control.key].toFixed(2)}</output></span>
              <input type="range" min={control.min} max={control.max} step="0.01" value={character.appearance[control.key]}
                onChange={(event) => updateAppearance(control.key, Number(event.target.value))} /></label>
          ))}</div>
        </div>
      )}

      {tab === 'wardrobe' && <MakeHumanAssetLibrary character={character} onChange={onChange} />}

      {tab === 'output' && (
        <div className="mh-tab-body output-settings">
          <label className="select-control"><span>Output target</span><select value={character.renderTarget}
            onChange={(event) => onChange({ ...character, renderTarget: event.target.value as CharacterState['renderTarget'] })}>
            <option value="general">General / GLB</option><option value="unreal">Unreal / FBX</option><option value="print">3D print / STL</option>
          </select></label>
          <label className="setting-check"><input type="checkbox" checked={character.rigCharacter} onChange={(event) => onChange({ ...character, rigCharacter: event.target.checked })} />
            <span><strong>Rig character</strong><small>Use the MakeHuman landmark skeleton and skin weights.</small></span></label>
          <label className="setting-check"><input type="checkbox" checked={character.generateTextures} onChange={(event) => onChange({ ...character, generateTextures: event.target.checked })} />
            <span><strong>Generate textures</strong><small>Keep the PBR material contract in the export recipe.</small></span></label>
          <label className="setting-check"><input type="checkbox" checked={character.blenderCleanup} onChange={(event) => onChange({ ...character, blenderCleanup: event.target.checked })} />
            <span><strong>Blender cleanup</strong><small>Prepare the production mesh for the selected output target.</small></span></label>
        </div>
      )}
    </section>
  );
}
