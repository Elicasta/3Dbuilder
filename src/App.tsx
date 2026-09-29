import { lazy, Suspense, useEffect, useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import CharacterControls from './components/CharacterControls';
import EngineLab from './components/EngineLab';
import MultiViewFitPanel from './components/MultiViewFitPanel';
import ReferenceUploader from './components/ReferenceUploader';
import WorkspaceNav, { type WorkspaceId } from './components/WorkspaceNav';
import { defaultsForLane } from './data/characterProfiles';
import {
  detectBlender,
  getLatestGeneratedMesh,
  getMakeHumanBaseObj,
  openInBlender,
  openCanonicalInBlender,
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

const CharacterViewport = lazy(() => import('./components/CharacterViewport'));

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
  const [buildStage, setBuildStage] = useState<'idle' | 'fit' | 'ai' | 'done' | 'fallback'>('idle');
  const [lastFit, setLastFit] = useState<MultiViewAnalysis | null>(null);
  const [makeHumanObj, setMakeHumanObj] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'canonical' | 'rig' | 'ai' | 'overlay'>('canonical');
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceId>('fit');

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

    getMakeHumanBaseObj()
      .then((obj) => {
        setMakeHumanObj(obj);
        setStatus('MakeHuman hm08 canonical body loaded.');
      })
      .catch(() => {
        // Keep the procedural cage as a resilient fallback until assets install.
      });
  }, []);

  function handleReference(slot: ReferenceSlot, file: File | null) {
    setReferences((current) => ({ ...current, [slot]: file }));
    setStatus(file ? `${slot} reference loaded` : `${slot} reference cleared`);
  }

  function applyFit(patch: Partial<BodyMorphs>, analysis: MultiViewAnalysis) {
    setCharacter((current) => {
      const fittedWeight = typeof patch.build === 'number'
        ? Math.max(0, Math.min(1, (patch.build - 0.78) / 0.44))
        : current.macro.weight;
      return {
        ...current,
        macro: { ...current.macro, weight: fittedWeight },
        morphs: { ...current.morphs, ...patch }
      };
    });
    setLastFit(analysis);
    setStatus(
      `Multi-view fit applied. Body fit quality ${Math.round(analysis.fitQuality * 100)}%, mask ${Math.round(analysis.confidence * 100)}%.`
    );
  }

  function resetBody() {
    setCharacter((current) => {
      const reset = defaultsForLane(current.lane, current.style, current);
      return {
        ...current,
        macro: {
          age: 0.5,
          muscle: 0.5,
          weight: 0.5,
          proportions: 0.5,
          african: 1 / 3,
          asian: 1 / 3,
          caucasian: 1 / 3
        },
        nativeModifiers: {},
        equippedAssets: [],
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
    setBuildStage('fit');
    setGeneratedMesh(null);

    try {
      const referenceCount = Object.values(references).filter(Boolean).length;

      if (referenceCount >= 2) {
        setStatus(`Analyzing ${referenceCount} reference views and fitting canonical body…`);
        const analysis = await analyzeMultiView(references);
        applyFit(analysis.morphPatch, analysis);
      }

      setBuildStage('ai');
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
        setBuildStage('done');
        setStatus(
          referenceCount === 3
            ? 'Multi-view body fit + AI mesh candidate complete. Blender can inspect the raw candidate while the builder keeps the editable canonical character.'
            : 'AI mesh generated. Add all three views for the strongest canonical fit.'
        );
      } catch (reconstructionError) {
        if (referenceCount >= 2) {
          setBuildStage('fallback');
          setStatus(
            `Canonical ${referenceCount}-view fit complete. AI geometry candidate skipped: ${String(reconstructionError)}`
          );
        } else {
          setBuildStage('fallback');
          throw reconstructionError;
        }
      }
    } catch (error) {
      setBuildStage('fallback');
      setStatus(`Build failed: ${String(error)}`);
    } finally {
      setBuilding(false);
    }
  }

  async function openCanonicalCharacter() {
    try {
      await openCanonicalInBlender(character);
      setStatus('The current hm08 character opened in Blender with its MakeHuman-derived armature and weights.');
    } catch (error) {
      setStatus(`Could not export canonical character: ${String(error)}`);
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

          <button className="secondary-button" type="button" onClick={() => void openCanonicalCharacter()}>
            Open Rigged Character in Blender
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

      <WorkspaceNav value={workspaceMode} onChange={setWorkspaceMode} />

      <div className="status-bar">
        <span className="status-dot" />
        <span>{status}</span>
        {building && <span className="phase-chip">{buildStage === 'fit' ? 'Fitting references' : 'Reconstructing AI mesh'}</span>}
        <span className="status-spacer" />
        <span>{character.lane}</span>
        <span>·</span>
        <span>{character.style}</span>
        <span>·</span>
        <span>{referenceCount}/3 refs</span>
        {lastFit && (
          <>
            <span>·</span>
            <span>fit {Math.round(lastFit.fitQuality * 100)}% · mask {Math.round(lastFit.confidence * 100)}%</span>
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
          {workspaceMode === 'fit' ? (
            <>
              <ReferenceUploader references={references} onSelect={handleReference} />
              <MultiViewFitPanel references={references} onFit={applyFit} />
              <section className="panel workflow-note">
                <div className="panel-header"><div><h2>Matching workflow</h2><p>Use a neutral T-pose when possible. Front and back constrain width; side constrains depth. The result stays editable in Character.</p></div></div>
              </section>
            </>
          ) : workspaceMode === 'character' ? (
            <CharacterControls character={character} onChange={setCharacter} onReset={resetBody} />
          ) : (
            <section className="panel workflow-note">
              <div className="panel-header"><div><h2>Engine configuration</h2><p>The canonical MakeHuman system is always the production base. Reconstruction engines only provide additional evidence.</p></div></div>
            </section>
          )}
        </aside>

        <div className="stage">
          <Suspense fallback={<section className="panel viewport-panel"><div className="panel-header"><div><h2>Live 3D Builder</h2><p>Loading graphics engine…</p></div></div><div className="viewport-canvas" /></section>}>
            <CharacterViewport
              character={character}
              aiMeshUrl={generatedMesh ? convertFileSrc(generatedMesh) : null}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              makeHumanObj={makeHumanObj}
            />
          </Suspense>

          <section className="panel pipeline-panel">
            <div className="pipeline-step done">
              <span>01</span>
              <div>
                <strong>Canonical model</strong>
                <small>hm08 topology · native MakeHuman modifiers</small>
              </div>
            </div>
            <div className={buildStage === 'fit' ? 'pipeline-step active' : referenceCount >= 2 || lastFit ? 'pipeline-step done' : 'pipeline-step next'}>
              <span>02</span>
              <div>
                <strong>Reference fit</strong>
                <small>Front · side · back → supported MakeHuman modifiers</small>
              </div>
            </div>
            <div className={buildStage === 'ai' ? 'pipeline-step active' : generatedMesh ? 'pipeline-step done' : 'pipeline-step next'}>
              <span>03</span>
              <div>
                <strong>Geometry evidence</strong>
                <small>TripoSR local candidate · GPU models stay optional</small>
              </div>
            </div>
            <div className="pipeline-step">
              <span>04</span>
              <div>
                <strong>Rig & export</strong>
                <small>hm08 mesh · MakeHuman weights → Blender / GLB / FBX</small>
              </div>
            </div>
          </section>

          {workspaceMode === 'engines' && <EngineLab />}
        </div>
      </section>
    </main>
  );
}
