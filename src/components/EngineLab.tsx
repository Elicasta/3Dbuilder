import { useCallback, useEffect, useMemo, useState } from 'react';
import { ENGINES } from '../data/engines';
import {
  getEngineStatuses,
  getSystemCapabilities,
  installEngineSource,
  prepareEngineRuntime
} from '../lib/desktop';
import type { EngineStatus, SystemCapabilities } from '../types/engine';

function valueOrMissing(value: string | null, fallback = 'not found') {
  return value ? 'found' : fallback;
}

export default function EngineLab() {
  const [capabilities, setCapabilities] = useState<SystemCapabilities | null>(null);
  const [statuses, setStatuses] = useState<EngineStatus[]>([]);
  const [busyEngine, setBusyEngine] = useState<string | null>(null);
  const [message, setMessage] = useState('Research adapters are source-only until their Python environments are prepared.');

  const refresh = useCallback(async () => {
    try {
      const [nextCapabilities, nextStatuses] = await Promise.all([
        getSystemCapabilities(),
        getEngineStatuses()
      ]);
      setCapabilities(nextCapabilities);
      setStatuses(nextStatuses);
    } catch (error) {
      setMessage(`Engine scan failed: ${String(error)}`);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const statusById = useMemo(
    () => new Map(statuses.map((status) => [status.id, status])),
    [statuses]
  );

  async function prepare(id: string) {
    setBusyEngine(id);
    setMessage(`Preparing ${id} runtime. This can take several minutes on first run…`);
    try {
      const path = await prepareEngineRuntime(id);
      setMessage(`${id} runtime ready: ${path}`);
      await refresh();
    } catch (error) {
      setMessage(`Prepare failed: ${String(error)}`);
    } finally {
      setBusyEngine(null);
    }
  }

  async function install(id: string) {
    setBusyEngine(id);
    setMessage(`Cloning ${id} source…`);
    try {
      const path = await installEngineSource(id);
      setMessage(`${id} source installed at ${path}`);
      await refresh();
    } catch (error) {
      setMessage(`Install failed: ${String(error)}`);
    } finally {
      setBusyEngine(null);
    }
  }

  return (
    <section className="panel engine-lab">
      <div className="panel-header engine-header">
        <div>
          <h2>Engine Lab</h2>
          <p>One builder, multiple reconstruction brains. Research-only engines stay isolated adapters.</p>
        </div>
        <button className="ghost-button" type="button" onClick={() => void refresh()}>
          Rescan
        </button>
      </div>

      <div className="capability-strip">
        <span>{capabilities ? `${capabilities.platform} · ${capabilities.arch}` : 'Scanning system…'}</span>
        <span>Blender: {capabilities ? valueOrMissing(capabilities.blenderPath) : '…'}</span>
        <span>Python: {capabilities ? valueOrMissing(capabilities.pythonPath) : '…'}</span>
        <span>Git: {capabilities ? valueOrMissing(capabilities.gitPath) : '…'}</span>
        <span>NVIDIA: {capabilities ? valueOrMissing(capabilities.nvidiaSmiPath, 'none detected') : '…'}</span>
      </div>

      <div className="engine-grid">
        {ENGINES.map((engine) => {
          const status = statusById.get(engine.id);
          const installed = status?.installed ?? false;
          const prepared = status?.prepared ?? false;

          return (
            <article className={installed ? 'engine-card installed' : 'engine-card'} key={engine.id}>
              <div className="engine-card-top">
                <div>
                  <span className="engine-role">{engine.role}</span>
                  <h3>{engine.name}</h3>
                </div>
                <span className={engine.priority === 'core' ? 'engine-priority core' : 'engine-priority'}>
                  {engine.priority}
                </span>
              </div>

              <p>{engine.summary}</p>
              <dl>
                <div>
                  <dt>Use</dt>
                  <dd>{engine.bestFor}</dd>
                </div>
                <div>
                  <dt>Runtime</dt>
                  <dd>{engine.runtime}</dd>
                </div>
              </dl>

              <div className="engine-card-bottom">
                <span className={installed ? 'engine-state ready' : 'engine-state'}>
                  {prepared ? 'Runtime ready' : installed ? 'Source installed' : 'Not installed'}
                </span>
                {engine.researchOnly && <span className="research-badge">research-only</span>}
                {!installed ? (
                  <button
                    className="secondary-button compact-button"
                    type="button"
                    disabled={busyEngine !== null || !capabilities?.gitPath}
                    onClick={() => void install(engine.id)}
                  >
                    {busyEngine === engine.id ? 'Installing…' : 'Install source'}
                  </button>
                ) : engine.id === 'triposr' && !prepared ? (
                  <button
                    className="secondary-button compact-button"
                    type="button"
                    disabled={busyEngine !== null || !capabilities?.pythonPath}
                    onClick={() => void prepare(engine.id)}
                  >
                    {busyEngine === engine.id ? 'Preparing…' : 'Prepare runtime'}
                  </button>
                ) : (
                  <button className="secondary-button compact-button" type="button" disabled>
                    {prepared ? 'Ready' : 'Source only'}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="engine-message" aria-live="polite">{message}</div>
    </section>
  );
}
