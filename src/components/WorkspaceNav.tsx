export type WorkspaceId = 'fit' | 'character' | 'engines';

interface WorkspaceNavProps {
  value: WorkspaceId;
  onChange: (value: WorkspaceId) => void;
}

const ITEMS: Array<{ id: WorkspaceId; label: string; hint: string }> = [
  { id: 'fit', label: 'Fit', hint: 'References & matching' },
  { id: 'character', label: 'Character', hint: 'Model · geometry · materials · output' },
  { id: 'engines', label: 'Engines', hint: 'Local & GPU workers' }
];

export default function WorkspaceNav({ value, onChange }: WorkspaceNavProps) {
  return (
    <nav className="workspace-nav" aria-label="3D Builder workspace">
      {ITEMS.map((item) => (
        <button key={item.id} type="button" className={value === item.id ? 'active' : ''} onClick={() => onChange(item.id)}>
          <strong>{item.label}</strong>
          <span>{item.hint}</span>
        </button>
      ))}
    </nav>
  );
}
