import { lazy, Suspense, useEffect, useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import CharacterStudioPanel from './components/CharacterStudioPanel';
import EngineLab from './components/EngineLab';
import MultiViewFitPanel from './components/MultiViewFitPanel';
import ReferenceUploader from './components/ReferenceUploader';
import WorkspaceNav, { type WorkspaceId } from './components/WorkspaceNav';
import { defaultsForLane } from './data/characterProfiles';
import {
  detectBlender,
  getLatestGeneratedMesh,
  getMakeHumanBaseObj,
  openCanonicalInBlender,
  runReconstruction,
  saveCharacterRecipe,
  stageReference,
  type BlenderStatus
} from './lib/desktop';
import { applyIdentityFit, solveIdentityFromAnalysis, solveIdentityFromReferences } from './lib/reconstructionFit';
import type { PosePreset } from './lib/pose';
import {
  DEFAULT_CHARACTER,
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

type BuildStage = 'idle' | 'analyzing' | 'fitting' | 'evidence' | 'done' | 'error';

export default function App() {
  const [references, setReferences] = useState<CharacterReferences>(EMPTY_REFERENCES);
  const [character, setCharacter] = useState<CharacterState>(DEFAULT_CHARACTER);
  const [status, setStatus] = useState('Character studio ready');
  const [blender, setBlender] = useState<BlenderStatus | null>(null);
  const [generatedMesh, setGeneratedMesh] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [buildStage, setBuildStage] = useState<BuildStage>('idle');
  const [lastFit, setLastFit] = useState<MultiViewAnalysis | null>(null);
  const [lastDiagnostic, setLastDiagnostic] = useState<MultiViewAnalysis | null>(null);
  const [makeHumanObj, setMakeHumanObj] = useState<string | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceId>('create');
  const [posePreset, setPosePreset] = useState<PosePreset>('tPose');
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [showAiEvidence, setShowAiEvidence] = useState(false);
  const [showEngines, setShowEngines] = useState(false);

  useEffect(() => {
    detectBlender()
      .then(setBlender)
      .catch(() => setBlender({ found: false, path: null, platform: 'browser' }));

    getLatestGeneratedMesh()
      .then((mesh) => {
        if (mesh) {
          setGeneratedMesh(mesh);
          setStatus('Previous geometry evidence is available for comparison.');
        }
      })
      .catch(() => {
        // A missing previous evidence mesh is a normal first-run state.
      });

    getMakeHumanBaseObj()
      .then((obj) => {
        setMakeHumanObj(obj);
        setStatus('Canonical character engine loaded.');
      })
      .catch(() => {
        setStatus('Canonical fallback loaded. Install the character engine assets for full human editing.');
      });
  }, []);

  function handleReference(slot: ReferenceSlot, file: File | null) {
    setReferences((current) => ({ ...current, [slot]: file }));
    setLastDiagnostic(null);
    setLastFit(null);
    setBuildStage('idle');
    setStatus(file ? `${slot} reference loaded` : `${slot} reference cleared`);
  }

  function resetCharacter() {
    setCharacter((current) => {
      const reset = defaultsForLane(current.lane, current.style, {
        ...DEFAULT_CHARACTER,
        name: current.name,
        lane: current.lane,
        style: current.style
      });

      return {
        ...reset,
        name: current.name,
        nativeModifiers: {},
        equippedAssets: [],
        details: DEFAULT_CHARACTER.details.map((detail) => ({ ...detail })),
        anatomy: { ...DEFAULT_CHARACTER.anatomy }
      };
    });
    setPosePreset('tPose');
    setShowSkeleton(false);
    setStatus('Character reset to the current base.');
  }

  async function saveRecipe() {
    try {
      const path = await saveCharacterRecipe(character);
      setStatus(`Editable character saved: ${path}`);
    } catch (error) {
      setStatus(`Save failed: ${String(error)}`);
    }
  }

  async function openCanonicalCharacter() {
    try {
      await openCanonicalInBlender(character);
      setStatus('Current character opened in Blender with its armature and weights.');
    } catch (error) {
      setStatus(`Could not open the character in Blender: ${String(error)}`);
    }
  }

  async function applyReferenceMatch() {
    const front = references.front;
    if (!front) {
      setStatus('Add a front reference first. Side and back views improve the same editable character.');
      return;
    }

    const referenceCount = Object.values(references).filter(Boolean).length;
    setBuilding(true);
    setGeneratedMesh((current) => (referenceCount >= 2 ? current : null));
    setShowAiEvidence(false);

    try {
      if (referenceCount >= 2) {
        setBuildStage('fitting');
        setStatus(`Fitting ${referenceCount} views to the current editable character…`);

        const fit = lastDiagnostic
          ? await solveIdentityFromAnalysis(lastDiagnostic, makeHumanObj ?? undefined, character)
          : await solveIdentityFromReferences(references, makeHumanObj ?? undefined, character);

        setCharacter((current) => applyIdentityFit(current, fit));
        setLastFit(fit.analysis);
        setBuildStage('done');
        setStatus(
          `Reference match applied · loss ${fit.objective.total.toFixed(3)}${fit.optimization ? ` · ${fit.optimization.initialLoss.toFixed(3)}→${fit.optimization.bestLoss.toFixed(3)} in ${fit.optimization.iterations} passes` : ''}.`
        );
        return;
      }

      setBuildStage('evidence');
      setStatus('One view cannot reliably define an editable identity. Generating optional geometry evidence instead…');
      const inputPath = await stageReference(front);
      const meshPath = await runReconstruction('triposr', inputPath);
      setGeneratedMesh(meshPath);
      setShowAiEvidence(true);
      setBuildStage('done');
      setStatus('Geometry evidence ready. Add side/back references to apply a shared editable identity match.');
    } catch (error) {
      setBuildStage('error');
      setStatus(`Reference operation failed: ${String(error)}`);
    } finally {
      setBuilding(false);
    }
  }

  function handleAnalysis(analysis: MultiViewAnalysis) {
    setLastDiagnostic(analysis);
    setBuildStage('analyzing');
    setStatus('Reference diagnostics complete. Apply the match to move the character sliders.');
    window.setTimeout(() => setBuildStage((current) => (current === 'analyzing' ? 'idle' : current)), 250);
  }

  const referenceCount = Object.values(references).filter(Boolean).length;
  const aiMeshUrl = generatedMesh ? convertFileSrc(generatedMesh) : null;
  const fitPercent = lastFit ? Math.round(lastFit.fitQuality * 100) : null;

  return (
    <main className="app-shell character-studio-shell">
      <header className="topbar studio-topbar">
        <div className="brand-group">
          <div className="brand-mark">3D</div>
          <div>
            <span className="eyebrow">Character Creator</span>
            <h1>3D Builder</h1>
          </div>
        </div>

        <div className="topbar-actions studio-topbar-actions">
          <label className="name-field">
            <span>Character</span>
            <input
              value={character.name}
              onChange={(event) => setCharacter((current) => ({ ...current, name: event.target.value }))}
            />
          </label>
          <button className="secondary-button" type="button" onClick={() => void saveRecipe()}>
            Save
          </button>
          <button
            className={showEngines ? 'secondary-button active-tool' : 'secondary-button'}
            type="button"
            onClick={() => setShowEngines((value) => !value)}
          >
            Character engines
          </button>
        </div>
      </header>

      <WorkspaceNav value={workspaceMode} onChange={setWorkspaceMode} />

      <div className="status-bar studio-status-bar">
        <span className={buildStage === 'error' ? 'status-dot error' : building ? 'status-dot busy' : 'status-dot'} />
        <span>{status}</span>
        {building && (
          <span className="phase-chip">
            {buildStage === 'fitting' ? 'Applying reference match' : buildStage === 'evidence' ? 'Generating evidence' : 'Working'}
          </span>
        )}
        <span className="status-spacer" />
        <span>{character.lane}</span>
        <span>·</span>
        <span>{character.style}</span>
        <span>·</span>
        <span>{referenceCount}/3 refs</span>
        {fitPercent !== null && (
          <>
            <span>·</span>
            <span>match {fitPercent}%</span>
          </>
        )}
        <span>·</span>
        <span>Blender {blender?.found ? 'ready' : blender === null ? 'checking' : 'not found'}</span>
      </div>

      <section className="workspace studio-workspace">
        <aside className="inspector studio-inspector">
          {workspaceMode === 'reference' ? (
            <>
              <ReferenceUploader references={references} onSelect={handleReference} />
              <MultiViewFitPanel references={references} onAnalysis={handleAnalysis} />

              <section className="panel reference-action-panel">
                <div className="studio-section-heading">
                  <span className="eyebrow">Apply to character</span>
                  <h2>Reference match</h2>
                  <p>
                    Two or three views solve the same character you edit everywhere else. A single view is kept as optional geometry evidence only.
                  </p>
                </div>
                <div className="reference-action-buttons">
                  <button
                    className="primary-button"
                    type="button"
                    disabled={building || referenceCount === 0}
                    onClick={() => void applyReferenceMatch()}
                  >
                    {building
                      ? buildStage === 'fitting'
                        ? 'Applying match…'
                        : 'Generating evidence…'
                      : referenceCount >= 2
                        ? 'Apply reference match'
                        : 'Generate geometry evidence'}
                  </button>

                  {generatedMesh && (
                    <label className="setting-check compact-setting">
                      <input
                        type="checkbox"
                        checked={showAiEvidence}
                        onChange={(event) => setShowAiEvidence(event.target.checked)}
                      />
                      <span>
                        <strong>Show geometry evidence</strong>
                        <small>Overlay the generated mesh without replacing the editable character.</small>
                      </span>
                    </label>
                  )}
                </div>
              </section>
            </>
          ) : (
            <CharacterStudioPanel
              mode={workspaceMode}
              character={character}
              onChange={setCharacter}
              onReset={resetCharacter}
              posePreset={posePreset}
              onPoseChange={setPosePreset}
              showSkeleton={showSkeleton}
              onShowSkeletonChange={setShowSkeleton}
              onSave={() => void saveRecipe()}
              onOpenBlender={() => void openCanonicalCharacter()}
              blenderReady={Boolean(blender?.found)}
            />
          )}
        </aside>

        <div className="stage studio-stage">
          <Suspense
            fallback={
              <section className="panel viewport-panel">
                <div className="panel-header">
                  <div>
                    <h2>Live character preview</h2>
                    <p>Loading graphics engine…</p>
                  </div>
                </div>
                <div className="viewport-canvas" />
              </section>
            }
          >
            <CharacterViewport
              character={character}
              posePreset={posePreset}
              onPoseChange={setPosePreset}
              showSkeleton={showSkeleton}
              aiMeshUrl={aiMeshUrl}
              showAiEvidence={showAiEvidence}
              makeHumanObj={makeHumanObj}
            />
          </Suspense>

          <section className="panel flow-status-strip">
            <div>
              <span>Character</span>
              <strong>One canonical editable state</strong>
            </div>
            <div>
              <span>Reference</span>
              <strong>{referenceCount >= 2 ? 'Ready to fit' : referenceCount === 1 ? 'Evidence only' : 'Manual editing'}</strong>
            </div>
            <div>
              <span>Rig</span>
              <strong>{character.rigCharacter ? 'Humanoid rig enabled' : 'Rig disabled'}</strong>
            </div>
            <div>
              <span>Output</span>
              <strong>{character.renderTarget === 'unreal' ? 'Unreal / FBX intent' : character.renderTarget === 'print' ? 'Print intent' : 'General / GLB intent'}</strong>
            </div>
          </section>

          {showEngines && <EngineLab />}
        </div>
      </section>
    </main>
  );
}
