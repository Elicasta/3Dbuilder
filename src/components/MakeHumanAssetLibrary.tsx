import { useEffect, useMemo, useState } from 'react';
import { getMakeHumanAssetCatalog, type MakeHumanAssetEntry } from '../lib/desktop';
import type { CharacterState } from '../types/character';

export default function MakeHumanAssetLibrary({ character, onChange }: {
  character: CharacterState;
  onChange: (next: CharacterState) => void;
}) {
  const [assets, setAssets] = useState<MakeHumanAssetEntry[]>([]);
  const [kind, setKind] = useState<MakeHumanAssetEntry['kind']>('geometry');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { getMakeHumanAssetCatalog().then(setAssets).catch((reason) => setError(String(reason))); }, []);
  const visible = useMemo(() => assets.filter((asset) => asset.kind === kind), [assets, kind]);
  const toggle = (asset: MakeHumanAssetEntry) => {
    if (asset.kind === 'material') return;
    const current=character.equippedAssets ?? [];
    const equipped=current.includes(asset.relativePath);
    const next=equipped ? current.filter((path)=>path!==asset.relativePath) :
      asset.kind === 'proxy'
        ? [...current.filter((path)=>!assets.some((item)=>item.kind==='proxy'&&item.relativePath===path)),asset.relativePath]
        : [...current,asset.relativePath];
    onChange({...character,equippedAssets:next});
  };

  return (
    <div className="mh-asset-library">
      <div className="mh-pane-heading"><strong>Installed MakeHuman assets</strong>
        <span>MHCLO geometry is fitted live to the evaluated hm08 body. Proxy selection is exclusive.</span></div>
      <nav className="mh-native-categories">
        {(['geometry','proxy','material'] as const).map((value) => (
          <button key={value} type="button" className={kind === value ? 'active' : ''} onClick={() => setKind(value)}>
            {value} · {assets.filter((asset) => asset.kind === value).length}
          </button>
        ))}
      </nav>
      {error ? <div className="mh-native-empty">{error}</div> :
        visible.length ? <div className="mh-asset-grid">{visible.map((asset) => {
          const equipped=character.equippedAssets?.includes(asset.relativePath);
          return <button type="button" key={asset.relativePath}
            className={equipped ? 'mh-asset-card active' : 'mh-asset-card'}
            disabled={asset.kind==='material'} onClick={()=>toggle(asset)}>
            <strong>{asset.name}</strong><span>{asset.relativePath}</span>
            <small>{asset.kind==='material' ? 'material source' : equipped ? 'Equipped' : 'Equip'}</small>
          </button>;
        })}</div> :
        <div className="mh-native-empty">No {kind} assets are installed in the current MakeHuman data library.</div>}
    </div>
  );
}
