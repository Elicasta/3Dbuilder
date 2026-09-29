import { useEffect, useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import CharacterControls from './components/CharacterControls';
import CharacterViewport from './components/CharacterViewport';
import EngineLab from './components/EngineLab';
import MultiViewFitPanel from './components/MultiViewFitPanel';
import ReferenceUploader from './components/ReferenceUploader';
import { defaultsForLane } from './data/characterProfiles';
import {
  detectBlender,
  getLatestGeneratedMesh,
  openInBlender,
  runReconstruction,
  saveCharacterRecipe,
  stageReference,
  type BlenderStatus
} from './lib/desktop';
import { analyzeMultiView } from './lib/multiview';
import {
  DEFAULT_CHARACTER,
  type BodyMorphs,
  type CharacterReferences,
  type CharacterState,
  type ReferenceSlot
} from './types/character';
import type { MultiViewAnalysis } from './types/multiview';

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
  const [generatedMesh, setGeneratedMesh] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [lastFit, setLastFit] = useState<MultiViewAnalysis | null>(null);
  const [viewMode, setViewMode] = useState<'canonical' | 'ai' | 'overlay'>('canonical');

  useEffect(() => {
    detectBlender()
      .then(setBlender)
      .catch(() => {
        setBlender({ found: false, path: null, platform: 'browser' });
      });

    getLatestGeneratedMesh()
      .then((mesh) => {
        if (mesh) {
          setGeneratedMesh(mesh);
          setStatus('Previous AI mesh candidate restored. Ready to inspect in Blender.');
        }
      })
      .catch(() => {
        // No previous candidate is a normal first-run state.
      });
  }, []);

  function handleReference(slot: ReferenceSlot, file: File | null) {
    setReferences((current) => ({ ...current, [slot]: file }));
    setStatus(file ? `${slot} reference loaded` : `${slot} reference cleared`);
  }

  function applyFit(patch: Partial<BodyMorphs>, analysis: MultiViewAnalysis) {
    setCharacter((current) => ({
      ...current,
      morphs: {
        ...current.morphs,
        ...patch
      }
    }));
    setLastFit(analysis);
    setStatus(
      `Multi-view fit applied at ${Math.round(analysis.confidence * 100)}% silhouette confidence.`
    );
  }

  function resetBody() {
    setCharacter((current) => {
      const reset = defaultsForLane(current.lane, current.style, current);
      return {
        ...current,
        morphs: reset.morphs,
        appearance: reset.appearance
      };
    });
    setStatus('Lane proportions and appearance reset.');
  }

  async function saveRecipe() {
    try {
      const path = await saveCharacterRecipe(character);
      setStatus(`Recipe saved: ${path}`);
    } catch (error) {
      setStatus(`Save failed: ${String(error)}`);
    }
  }

  async function buildCharacter() {
    const front = references.front;
    if (!front) {
      setStatus('Add a front reference first. Full builds are multi-view whenever side/back are available.');
      return;
    }

    setBuilding(true);
    setGeneratedMesh(null);

    try {
      const referenceCount = Object.values(references).filter(Boolean).length;

      if (referenceCount >= 2) {
        setStatus(`Analyzing ${referenceCount} reference views and fitting canonical body…`);
        const analysis = await analyzeMultiView(references);
        applyFit(analysis.morphPatch, analysis);
      }

      setStatus(
        referenceCount === 3
          ? 'Canonical 3-view fit complete. Running AI geometry candidate…'
          : 'Running AI geometry candidate from the front reference…'
      );

      try {
        const inputPath = await stageReference(front);
        const meshPath = await runReconstruction('triposr', inputPath);

        setGeneratedMesh(meshPath);
        setViewMode('ai');
        setStatus(
          referenceCount === 3
            ? 'Multi-view body fit + AI mesh candidate complete. Blender can inspect the raw candidate while the builder keeps the editable canonical character.'
            : 'AI mesh generated. Add all three views for the strongest canonical fit.'
        );
      } catch (reconstructionError) {
        if (referenceCount >= 2) {
          setStatus(
            `Canonical ${referenceCount}-view fit complete. AI geometry candidate skipped: ${String(reconstructionError)}`
          );
        } else {
          throw reconstructionError;
        }
      }
    } catch (error) {
      setStatus(`Build failed: ${String(error)}`);
    } finally {
      setBuilding(false);
    }
  }

  async function openGeneratedMesh() {
    if (!generatedMesh) return;
    try {
      await openInBlender(generatedMesh);
      setStatus('Generated mesh opened in Blender.');
    } catch (error) {
      setStatus(`Could not open Blender: ${String(error)}`);
    }
  }

  const referenceCount = Object.values(references).filter(Boolean).length;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-group">
          <div className="brand-mark">3D</div>
          <div>
            <span className="eyebrow">Mac + Windows · Character Lab</span>
            <h1>3D Builder</h1>
          </div>
        </div>

        <div className="topbar-actions">
          <label className="name-field">
            <span>Character</span>
            <input
              value={character.name}
              onChange={(event) =>
                setCharacter({
                  ...character,
                  name: event.target.value
                })
              }
            />
          </label>

          <button className="secondary-button" type="button" onClick={saveRecipe}>
            Save recipe
          </button>

          {generatedMesh && (
            <button
              className="secondary-button"
              type="button"
              onClick={() => void openGeneratedMesh()}
            >
              Open AI mesh in Blender
            </button>
          )}

          <button
            className="primary-button"
            type="button"
            disabled={building}
            onClick={() => void buildCharacter()}
          >
            {building ? 'Building…' : referenceCount === 3 ? 'Build 3-View Character' : 'Build Character'}
          </button>
        </div>
      </header>

      <div className="status-bar">
        <span className="status-dot" />
        <span>{status}</span>
        <span className="status-spacer" />
        <span>{character.lane}</span>
        <span>·</span>
        <span>{character.style}</span>
        <span>·</span>
        <span>{referenceCount}/3 refs</span>
        {lastFit && (
          <>
            <span>·</span>
            <span>fit {Math.round(lastFit.confidence * 100)}%</span>
          </>
        )}
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
          <MultiViewFitPanel references={references} onFit={applyFit} />
          <CharacterControls
            character={character}
            onChange={setCharacter}
            onReset={resetBody}
          />
        </aside>

        <div className="stage">
          <CharacterViewport
            character={character}
            aiMeshUrl={generatedMesh ? convertFileSrc(generatedMesh) : null}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          <section className="panel pipeline-panel">
            <div className="pipeline-step done">
              <span>01</span>
              <div>
                <strong>Profile</strong>
                <small>Male · Female · Alien / 3 style families</small>
              </div>
            </div>
            <div className={referenceCount === 3 ? 'pipeline-step done' : 'pipeline-step next'}>
              <span>02</span>
              <div>
                <strong>Multi-view fit</strong>
                <small>Front · side · back → canonical morphs</small>
              </div>
            </div>
            <div className={generatedMesh ? 'pipeline-step done' : 'pipeline-step next'}>
              <span>03</span>
              <div>
                <strong>AI reconstruction</strong>
                <small>TripoSR now · CharacterGen / research fusion next</small>
              </div>
            </div>
            <div className="pipeline-step">
              <span>04</span>
              <div>
                <strong>Finish & export</strong>
                <small>Blender · Unreal FBX · GLB · BLEND · STL</small>
              </div>
            </div>
          </section>

          <EngineLab />
        </div>
      </section>
    </main>
  );
}
