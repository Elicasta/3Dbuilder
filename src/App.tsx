import { useEffect, useState } from 'react';
import CharacterControls from './components/CharacterControls';
import CharacterViewport from './components/CharacterViewport';
import ReferenceUploader from './components/ReferenceUploader';
import {
  detectBlender,
  saveCharacterRecipe,
  type BlenderStatus
} from './lib/desktop';
import {
  DEFAULT_CHARACTER,
  type CharacterReferences,
  type CharacterState,
  type ReferenceSlot
} from './types/character';

const EMPTY_REFERENCES: CharacterReferences = {
  front: null,
  side: null,
  back: null
};

export default function App() {
  const [references, setReferences] = useState<CharacterReferences>(EMPTY_REFERENCES);
  const [character, setCharacter] = useState<CharacterState>(DEFAULT_CHARACTER);
  const [status, setStatus] = useState('Desktop builder ready');
  const [blender, setBlender] = useState<BlenderStatus | null>(null);

  useEffect(() => {
    detectBlender()
      .then(setBlender)
      .catch(() => {
        setBlender({ found: false, path: null, platform: 'browser' });
      });
  }, []);

  function handleReference(slot: ReferenceSlot, file: File | null) {
    setReferences((current) => ({ ...current, [slot]: file }));
    setStatus(file ? `${slot} reference loaded` : `${slot} reference cleared`);
  }

  function resetBody() {
    setCharacter((current) => ({
      ...current,
      morphs: { ...DEFAULT_CHARACTER.morphs }
    }));
    setStatus('Body proportions reset');
  }

  async function saveRecipe() {
    try {
      const path = await saveCharacterRecipe(character);
      setStatus(`Recipe saved: ${path}`);
    } catch (error) {
      setStatus(`Save failed: ${String(error)}`);
    }
  }

  const referenceCount = Object.values(references).filter(Boolean).length;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-group">
          <div className="brand-mark">3D</div>
          <div>
            <span className="eyebrow">Mac + Windows · Alpha</span>
            <h1>3D Builder</h1>
          </div>
        </div>

        <div className="topbar-actions">
          <label className="name-field">
            <span>Character</span>
            <input
              value={character.name}
              onChange={(event) => setCharacter({ ...character, name: event.target.value })}
            />
          </label>
          <button className="secondary-button" type="button" onClick={saveRecipe}>
            Save recipe
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={() =>
              setStatus(
                referenceCount
                  ? `Reference build queued from ${referenceCount}/3 views. Reconstruction engine is the next layer.`
                  : 'Procedural builder is active. Add reference views for reconstruction.'
              )
            }
          >
            Build Character
          </button>
        </div>
      </header>

      <div className="status-bar">
        <span className="status-dot" />
        <span>{status}</span>
        <span className="status-spacer" />
        <span>{referenceCount}/3 refs</span>
        <span>·</span>
        <span>
          Blender:{' '}
          {blender === null
            ? 'checking'
            : blender.found
              ? `found · ${blender.platform}`
              : `not found · ${blender.platform}`}
        </span>
      </div>

      <section className="workspace">
        <aside className="inspector">
          <ReferenceUploader references={references} onSelect={handleReference} />
          <CharacterControls character={character} onChange={setCharacter} onReset={resetBody} />
        </aside>

        <div className="stage">
          <CharacterViewport character={character} />

          <section className="panel pipeline-panel">
            <div className="pipeline-step done">
              <span>01</span>
              <div>
                <strong>Desktop foundation</strong>
                <small>Tauri shell · macOS · Windows</small>
              </div>
            </div>
            <div className="pipeline-step done">
              <span>02</span>
              <div>
                <strong>Character model + live viewport</strong>
                <small>Body morphs · materials · wardrobe</small>
              </div>
            </div>
            <div className="pipeline-step next">
              <span>03</span>
              <div>
                <strong>Reference reconstruction</strong>
                <small>Front / side / back → fitted base mesh</small>
              </div>
            </div>
            <div className="pipeline-step">
              <span>04</span>
              <div>
                <strong>Blender automation + rig export</strong>
                <small>GLB · FBX · BLEND</small>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
