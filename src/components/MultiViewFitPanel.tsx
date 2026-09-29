import { useState } from 'react';
import { analyzeMultiView } from '../lib/multiview';
import type { BodyMorphs, CharacterReferences } from '../types/character';
import type { MultiViewAnalysis } from '../types/multiview';

interface MultiViewFitPanelProps {
  references: CharacterReferences;
  onFit: (patch: Partial<BodyMorphs>, analysis: MultiViewAnalysis) => void;
}

export default function MultiViewFitPanel({
  references,
  onFit
}: MultiViewFitPanelProps) {
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState<MultiViewAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const count = Object.values(references).filter(Boolean).length;

  async function fit() {
    setBusy(true);
    setError(null);
    try {
      const result = await analyzeMultiView(references);
      setAnalysis(result);
      onFit(result.morphPatch, result);
    } catch (reason) {
      setError(String(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel multiview-panel">
      <div className="panel-header split-header">
        <div>
          <h2>Multi-view Fit</h2>
          <p>Front + side + back constrain one editable canonical character.</p>
        </div>
        <span className={count === 3 ? 'view-count ready' : 'view-count'}>{count}/3</span>
      </div>

      <div className="multiview-body">
        <button
          className="primary-button fit-button"
          type="button"
          disabled={busy || count === 0}
          onClick={() => void fit()}
        >
          {busy ? 'Analyzing views…' : count === 3 ? 'Fit from all 3 views' : 'Fit available views'}
        </button>

        {error && <p className="fit-error">{error}</p>}

        {analysis && (
          <div className="fit-results">
            <div>
              <span>Silhouette confidence</span>
              <strong>{Math.round(analysis.confidence * 100)}%</strong>
            </div>
            <div>
              <span>Views analyzed</span>
              <strong>{count}</strong>
            </div>
            {analysis.notes.length > 0 && (
              <p>{analysis.notes.join(' ')}</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
