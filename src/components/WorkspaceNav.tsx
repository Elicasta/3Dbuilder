export type WorkspaceId =
  | 'create'
  | 'shape'
  | 'appearance'
  | 'reference'
  | 'clothing'
  | 'poseRig'
  | 'export';

interface WorkspaceNavProps {
  value: WorkspaceId;
  onChange: (value: WorkspaceId) => void;
}

const ITEMS: Array<{ id: WorkspaceId; label: string; hint: string }> = [
  { id: 'create', label: 'Create', hint: 'Base character' },
  { id: 'shape', label: 'Shape', hint: 'Body & face' },
  { id: 'appearance', label: 'Appearance', hint: 'Skin · eyes · hair · details' },
  { id: 'reference', label: 'Reference', hint: 'Photo matching' },
  { id: 'clothing', label: 'Clothing', hint: 'Wardrobe & assets' },
  { id: 'poseRig', label: 'Pose / Rig', hint: 'Pose tests & skeleton' },
  { id: 'export', label: 'Export', hint: 'Blender · GLB · FBX' }
];

export default function WorkspaceNav({ value, onChange }: WorkspaceNavProps) {
  return (
    <nav className="workspace-nav builder-flow-nav" aria-label="3D Builder workflow">
      {ITEMS.map((item, index) => (
        <button key={item.id} type="button" className={value === item.id ? 'active' : ''} onClick={() => onChange(item.id)}>
          <span className="flow-index">{String(index + 1).padStart(2, '0')}</span>
          <strong>{item.label}</strong>
          <span>{item.hint}</span>
        </button>
      ))}
    </nav>
  );
}
