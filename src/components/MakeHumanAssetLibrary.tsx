import { useEffect, useMemo, useState } from 'react';
import { getMakeHumanAssetCatalog, type MakeHumanAssetEntry } from '../lib/desktop';
import type { CharacterState } from '../types/character';

type AssetView = 'hair' | 'clothing' | 'anatomy' | 'proxy' | 'materials';

const isHair = (asset: MakeHumanAssetEntry) => {
  const lower = asset.relativePath.toLowerCase();
  return (lower.includes('/hair/') || lower.includes('hair')) && !lower.includes('eyebrow') && !lower.includes('brow');
};

const isAnatomy = (asset: MakeHumanAssetEntry) =>
  /genital|penis|vulva|vagina|labia/i.test(asset.relativePath);

const isClothing = (asset: MakeHumanAssetEntry) =>
  asset.kind === 'geometry' && !isHair(asset) && !isAnatomy(asset);

export default function MakeHumanAssetLibrary({ character, onChange, initialView = 'clothing' }: {
  character: CharacterState;
  onChange: (next: CharacterState) => void;
  initialView?: AssetView;
}) {
  const [assets, setAssets] = useState<MakeHumanAssetEntry[]>([]);
  const [kind, setKind] = useState<AssetView>(initialView);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMakeHumanAssetCatalog().then(setAssets).catch((reason) => setError(String(reason)));
  }, []);

  const visible = useMemo(() => {
    if (kind === 'hair') return assets.filter((asset) => asset.kind !== 'material' && isHair(asset));
    if (kind === 'anatomy') return assets.filter((asset) => asset.kind !== 'material' && isAnatomy(asset));
    if (kind === 'clothing') return assets.filter(isClothing);
    if (kind === 'proxy') return assets.filter((asset) => asset.kind === 'proxy');
    return assets.filter((asset) => asset.kind === 'material');
  }, [assets, kind]);

  const count = (view: AssetView) => {
    if (view === 'hair') return assets.filter((asset) => asset.kind !== 'material' && isHair(asset)).length;
    if (view === 'anatomy') return assets.filter((asset) => asset.kind !== 'material' && isAnatomy(asset)).length;
    if (view === 'clothing') return assets.filter(isClothing).length;
    if (view === 'proxy') return assets.filter((asset) => asset.kind === 'proxy').length;
    return assets.filter((asset) => asset.kind === 'material').length;
  };

  const toggle = (asset: MakeHumanAssetEntry) => {
    if (asset.kind === 'material') return;

    const current = character.equippedAssets ?? [];
    const equipped = current.includes(asset.relativePath);
    let next: string[];

    if (equipped) {
      next = current.filter((path) => path !== asset.relativePath);
    } else if (isHair(asset)) {
      next = [
        ...current.filter((path) => !assets.some((item) => isHair(item) && item.relativePath === path)),
        asset.relativePath
      ];
    } else if (isAnatomy(asset)) {
      next = [
        ...current.filter((path) => !assets.some((item) => isAnatomy(item) && item.relativePath === path)),
        asset.relativePath
      ];
    } else if (asset.kind === 'proxy') {
      next = [
        ...current.filter((path) => !assets.some((item) => item.kind === 'proxy' && item.relativePath === path)),
        asset.relativePath
      ];
    } else {
      next = [...current, asset.relativePath];
    }

    onChange({ ...character, equippedAssets: next });
  };

  return (
    <div className="mh-asset-library">
      <div className="mh-pane-heading">
        <strong>Character asset library</strong>
        <span>Installed MakeHuman assets are fit to the same editable body. Hair, anatomy and proxy slots are exclusive.</span>
      </div>
      <nav className="mh-native-categories asset-category-row">
        {(['clothing', 'hair', 'anatomy', 'proxy', 'materials'] as AssetView[]).map((value) => (
          <button key={value} type="button" className={kind === value ? 'active' : ''} onClick={() => setKind(value)}>
            {value} · {count(value)}
          </button>
        ))}
      </nav>
      {error ? (
        <div className="mh-native-empty">{error}</div>
      ) : visible.length ? (
        <div className="mh-asset-grid">
          {visible.map((asset) => {
            const equipped = character.equippedAssets?.includes(asset.relativePath);
            return (
              <button
                type="button"
                key={asset.relativePath}
                className={equipped ? 'mh-asset-card active' : 'mh-asset-card'}
                disabled={asset.kind === 'material'}
                onClick={() => toggle(asset)}
              >
                <strong>{asset.name}</strong>
                <span>{asset.relativePath}</span>
                <small>{asset.kind === 'material' ? 'material source' : equipped ? 'Equipped' : 'Equip'}</small>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mh-native-empty">No {kind} assets are installed in the current character library.</div>
      )}
    </div>
  );
}
