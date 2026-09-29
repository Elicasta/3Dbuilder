import { useState } from 'react';
import { analyzeMultiView } from '../lib/multiview';
import type { CharacterReferences } from '../types/character';
import type { MultiViewAnalysis } from '../types/multiview';

interface MultiViewFitPanelProps {
  references: CharacterReferences;
  onAnalysis?: (analysis: MultiViewAnalysis) => void;
}

export default function MultiViewFitPanel({ references, onAnalysis }: MultiViewFitPanelProps) {
  const [busy, setBusy] = useState(false);
  const [analysis, setAnalysis] = useState<MultiViewAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const count = Object.values(references).filter(Boolean).length;

  async function fit() {
    setBusy(true);
    setError(null);
    try {
      let timer:number|undefined;
      const result = await Promise.race([
        analyzeMultiView(references,{landmarks:false}),
        new Promise<never>((_,reject)=>{
          timer=window.setTimeout(()=>reject(new Error('Reference analysis exceeded 20 seconds. Retry, or use Build Character to continue with available fallback evidence.')),20000);
        })
      ]).finally(()=>{if(timer!==undefined)window.clearTimeout(timer)});
      setAnalysis(result);
      onAnalysis?.(result);
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
          <h2>Reference diagnostics</h2>
          <p>Fast silhouette diagnostics here. Build Character runs deeper landmark/refinement fitting.</p>
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
          {busy ? 'Analyzing views…' : error ? 'Retry analysis' : 'Analyze references'}
        </button>

        {error && <p className="fit-error">{error}</p>}

        {analysis && (
          <div className="fit-results">
            <div>
              <span>Mask extraction</span>
              <strong>{Math.round(analysis.confidence * 100)}%</strong>
            </div>
            <div>
              <span>Reference observation quality</span>
              <strong>{Math.round(analysis.fitQuality * 100)}%</strong>
            </div>
            <div>
              <span>Landmarks in diagnostics</span>
              <strong>Skipped</strong>
            </div>
            <div>
              <span>Views analyzed</span>
              <strong>{count}/3</strong>
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
