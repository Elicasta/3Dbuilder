import { useEffect, useMemo, useState } from 'react';
import { getMakeHumanAssetCatalog, type MakeHumanAssetEntry } from '../lib/desktop';

export default function MakeHumanAssetLibrary() {
  const [assets, setAssets] = useState<MakeHumanAssetEntry[]>([]);
  const [kind, setKind] = useState<MakeHumanAssetEntry['kind']>('geometry');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMakeHumanAssetCatalog().then(setAssets).catch((reason) => setError(String(reason)));
  }, []);

  const visible = useMemo(() => assets.filter((asset) => asset.kind === kind), [assets, kind]);

  return (
    <div className="mh-asset-library">
      <div className="mh-pane-heading"><strong>Installed MakeHuman assets</strong>
        <span>Real MHCLO geometry, proxies and MHMAT materials discovered from the local MakeHuman data library.</span></div>
      <nav className="mh-native-categories">
        {(['geometry','proxy','material'] as const).map((value) => (
          <button key={value} type="button" className={kind === value ? 'active' : ''} onClick={() => setKind(value)}>
            {value} · {assets.filter((asset) => asset.kind === value).length}
          </button>
        ))}
      </nav>
      {error ? <div className="mh-native-empty">{error}</div> :
        visible.length ? <div className="mh-asset-grid">{visible.map((asset) => (
          <article key={asset.relativePath} className="mh-asset-card">
            <strong>{asset.name}</strong><span>{asset.relativePath}</span>
          </article>
        ))}</div> :
        <div className="mh-native-empty">No {kind} assets are installed in the current MakeHuman data library.</div>}
    </div>
  );
}
